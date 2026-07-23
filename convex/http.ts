import { httpRouter } from "convex/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { authComponent, createAuth, relatedOrigins } from "./auth";
import { env, httpAction } from "./_generated/server";
import { invalidateApps } from "./lib/apps";
import { parseRegistration, secretMatches } from "./lib/registration";

const http = httpRouter();

// Every Better Auth route is served straight off the Convex deployment, with
// CORS on so consumer apps can call it from their own origin instead of being
// bounced through a hosted AussieAuth page.
authComponent.registerRoutes(http, createAuth, { cors: true });

/**
 * Sign in with Apple only accepts return URLs on a domain you've proven you
 * own, and it proves it by fetching this file. Paste the contents Apple gives
 * you into APPLE_DOMAIN_ASSOCIATION, then hit Verify.
 */
http.route({
  path: "/.well-known/apple-developer-domain-association.txt",
  method: "GET",
  handler: httpAction(async () => {
    const body = env.APPLE_DOMAIN_ASSOCIATION;
    if (!body) return new Response("Not configured", { status: 404 });
    return new Response(body, { headers: { "Content-Type": "text/plain" } });
  }),
});

/**
 * The Apple App Site Association file, which is how an iOS app proves it's
 * allowed to act for this domain. Two capabilities ride on it:
 *
 *   - `webcredentials` lets a native app use a passkey whose rpID is
 *     `aussieauth.com`. Related Origin Requests (below) is the web equivalent
 *     and does nothing for native — this file is the only route in.
 *   - `applinks` lets a magic-link email open the app directly instead of
 *     bouncing through Safari.
 *
 * Served from an env var rather than assembled here, matching the Apple
 * domain-association route above: the exact JSON depends on your Team ID and
 * bundle id, and Apple's requirements for it have changed before. Unset means
 * 404, which is the honest answer — a malformed file is worse than no file,
 * because iOS caches what it fetches.
 *
 * Set it to something like:
 *
 *   {"applinks":{"details":[{"appIDs":["J53N6D4ML3.com.aussieauth.ios"],
 *     "components":[{"/":"/*"}]}]},
 *    "webcredentials":{"apps":["J53N6D4ML3.com.aussieauth.ios"]}}
 *
 * Note this does nothing under Expo Go, which runs as Expo's own bundle id.
 * It only takes effect in a development or production build.
 */
http.route({
  path: "/.well-known/apple-app-site-association",
  method: "GET",
  handler: httpAction(async () => {
    const body = env.APPLE_APP_SITE_ASSOCIATION;
    if (!body) return new Response("Not configured", { status: 404 });
    // Apple requires application/json and no file extension.
    return new Response(body, {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * WebAuthn Related Origin Requests: the list of origins allowed to use a
 * passkey whose relying party id is ours.
 *
 * Without this a passkey registered here is unusable from any other domain,
 * which for a shared auth server is the one method that most needs to travel.
 * The browser fetches this from the *rpID's* domain — `aussieauth.com`, not
 * the Convex deployment — so `vercel.json` proxies the path back here rather
 * than us serving a static file that would drift from `TRUSTED_ORIGINS`.
 */
http.route({
  path: "/.well-known/webauthn",
  method: "GET",
  handler: httpAction(async (ctx) => {
    return new Response(
      JSON.stringify({ origins: await relatedOrigins(ctx) }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }),
});

/**
 * How an app joins. It sends its own config — slug, name, origins, and the
 * methods it wants — and from then on its origins are trusted.
 *
 * Deliberately *not* a Better Auth endpoint. This is called server-to-server
 * from the other app's Convex, which sends no `Origin` header, and Better
 * Auth's CSRF check rejects an originless POST outright. Provisioning isn't an
 * auth operation anyway; the bearer secret is the whole authorization story.
 */
http.route({
  path: "/apps/register",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = env.AUSSIEAUTH_SECRET;
    if (!expected) {
      // Refuse rather than accept anything: an unset secret must not read as
      // "registration is open".
      return Response.json(
        { error: "Registration is not configured on this deployment" },
        { status: 503 },
      );
    }

    const given = (request.headers.get("authorization") ?? "").replace(
      /^Bearer /,
      "",
    );
    if (!secretMatches(given, expected)) {
      return Response.json({ error: "Bad or missing secret" }, { status: 401 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = parseRegistration(body);
    if ("error" in parsed) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    try {
      const result = await ctx.runMutation(internal.apps.register, parsed.app);
      // So this isolate stops serving the pre-registration origin list.
      invalidateApps();
      return Response.json(result);
    } catch (e) {
      // The one expected failure is an origin another app already owns, which
      // is the caller's problem to fix rather than a server fault. Anything
      // else is ours, and shouldn't be echoed back with a stack trace.
      if (e instanceof ConvexError) {
        return Response.json({ error: String(e.data) }, { status: 409 });
      }
      console.error("App registration failed", e);
      return Response.json({ error: "Registration failed" }, { status: 500 });
    }
  }),
});

/**
 * The registered origins, for the CORS layer.
 *
 * Public and unauthenticated, which is fine — these same origins are already
 * published at `/.well-known/webauthn`, because passkeys can't work
 * cross-domain unless a browser can read the list.
 *
 * It exists because CORS preflight has no database access: the allow-list is
 * built from an auth instance created with an empty ctx, so the only way to
 * hand it a runtime origin list is over HTTP. See `originsOverHttp`.
 */
http.route({
  path: "/apps/origins",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const { origins } = await ctx.runQuery(internal.apps.snapshot, {});
    return Response.json({ origins });
  }),
});

/** Revoke an app. Same secret, same reasoning as `/apps/register`. */
http.route({
  path: "/apps/unregister",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = env.AUSSIEAUTH_SECRET;
    if (!expected) {
      return Response.json(
        { error: "Registration is not configured on this deployment" },
        { status: 503 },
      );
    }
    const given = (request.headers.get("authorization") ?? "").replace(
      /^Bearer /,
      "",
    );
    if (!secretMatches(given, expected)) {
      return Response.json({ error: "Bad or missing secret" }, { status: 401 });
    }

    const body: unknown = await request.json().catch(() => null);
    const slug = (body as { slug?: unknown } | null)?.slug;
    if (typeof slug !== "string" || !slug) {
      return Response.json({ error: "slug is required" }, { status: 400 });
    }

    const result = await ctx.runMutation(internal.apps.unregister, { slug });
    invalidateApps();
    return Response.json(result);
  }),
});

export default http;
