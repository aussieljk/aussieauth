import { httpRouter } from "convex/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import {
  authComponent,
  createAuth,
  relatedOrigins,
  relatedOriginUsage,
  trustedOrigins,
} from "./auth";
import { env, httpAction } from "./_generated/server";
import { invalidateApps, isTrustedOrigin, RELATED_ORIGIN_LABEL_LIMIT } from "./lib/apps";
import { parseRegistration, secretMatches } from "./lib/registration";

const http = httpRouter();

// Every Better Auth route is served straight off the Convex deployment, with
// CORS on so consumer apps can call it from their own origin instead of being
// bounced through a hosted AussieAuth page.
//
// The *lazy* variant, because the eager one builds an auth instance at module
// scope (`createAuth({})`) and Better Auth resolves `trustedOrigins` while
// initialising its context. With no ctx to query, ours falls back to fetching
// `/apps/origins` over HTTP — and Convex refuses a fetch during import, so
// every cold isolate logged "fetch() unsupported at import time" before it had
// served anything. Lazy defers that instance to the first CORS preflight,
// where a fetch is allowed. Plugin-contributed origins still come through it,
// so the allow-list is unchanged.
authComponent.registerRoutesLazy(http, createAuth, { cors: true });

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
    return new Response(JSON.stringify({ origins: await relatedOrigins(ctx) }), {
      headers: { "Content-Type": "application/json" },
    });
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

    const given = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
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
      // WebAuthn honours related origins on at most five distinct sites, and a
      // browser ignores the overflow silently — passkeys just don't work on
      // whichever app landed past the cap. Answering with the slot usage puts
      // that in the registering app's logs instead of leaving it to be
      // discovered as an unexplainable passkey failure.
      const { kept, dropped } = await relatedOriginUsage(ctx);
      return Response.json({
        ...result,
        passkeyOrigins: { limit: RELATED_ORIGIN_LABEL_LIMIT, active: kept, dropped },
      });
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

/**
 * What this deployment knows about the calling origin: which app claimed it,
 * and which methods that app may use.
 *
 * The gap this closes: an app registers a method list, the server enforces it,
 * and until now the app couldn't read it back — so the card drew buttons for
 * methods guaranteed to 403 and you found out one click at a time. Reading it
 * turns a 403-on-click into a button that was never drawn.
 *
 * It also answers the question behind the invisible CORS failure. A request
 * blocked before it left the browser has no response to inspect; this one is
 * readable from *any* origin, so "the deployment is up and it doesn't know
 * you" becomes something a client can actually distinguish and say.
 *
 * Unauthenticated on purpose, and safe: it tells an origin about itself and
 * nothing else — no listing, no lookup by slug — and the origin list is
 * already public at `/.well-known/webauthn`.
 *
 * Not a Better Auth endpoint, deliberately. Those ride the CORS allow-list,
 * which is exactly the list an unregistered origin isn't on, so the one caller
 * that most needs this answer would be the one blocked from reading it.
 */
const ME_CORS = {
  // `*` rather than the echoed origin because there are no credentials on this
  // route and nothing origin-specific to protect — the answer is derived from
  // the Origin header, not from a cookie.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
} as const;

http.route({
  path: "/apps/me",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin") ?? request.headers.get("expo-origin");
    if (!origin) {
      // Server-to-server, or curl. There's no origin to answer about, and
      // guessing one would be worse than saying so.
      return Response.json(
        { registered: false, origin: null, reason: "No Origin header on the request" },
        { headers: ME_CORS },
      );
    }

    const [app, origins] = await Promise.all([
      ctx.runQuery(internal.apps.forOrigin, { origin }),
      trustedOrigins(ctx),
    ]);

    return Response.json(
      {
        origin,
        /**
         * Whether the request will be allowed at all. Not the same question as
         * `registered`: this deployment's own site is trusted through
         * `SITE_URL` and owns no row in `apps`, so an app-shaped answer alone
         * would report the sign-in page as locked out of its own server.
         */
        trusted: isTrustedOrigin(origins, origin),
        /** Whether a registered app claimed it, which is what gates `methods`. */
        registered: Boolean(app),
        slug: app?.slug ?? null,
        name: app?.name ?? null,
        /** null means every method is allowed, matching the registry. */
        methods: app?.methods ?? null,
      },
      { headers: ME_CORS },
    );
  }),
});

http.route({
  path: "/apps/me",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: ME_CORS })),
});

/**
 * Revoke an app. Same secret, same reasoning as `/apps/register`.
 *
 * Answers with what *would* be removed unless the body says `confirm: true`,
 * so the destructive form is the one you have to ask for. Registering is
 * idempotent and safe to repeat; this is neither, and the two otherwise sit
 * behind the same secret with the same shape of request — one word of
 * difference between "add my app" and "cut my app off".
 */
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
    const given = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
    if (!secretMatches(given, expected)) {
      return Response.json({ error: "Bad or missing secret" }, { status: 401 });
    }

    const body: unknown = await request.json().catch(() => null);
    const { slug, confirm } = (body ?? {}) as { slug?: unknown; confirm?: unknown };
    if (typeof slug !== "string" || !slug) {
      return Response.json({ error: "slug is required" }, { status: 400 });
    }

    const preview = await ctx.runQuery(internal.apps.revocationPreview, { slug });
    if (!preview) {
      // Already gone, or never here. Not an error — the caller wanted this app
      // to have no access, and it doesn't.
      return Response.json({ slug, removed: false, origins: [] });
    }

    if (confirm !== true) {
      return Response.json({
        slug,
        removed: false,
        dryRun: true,
        wouldRemove: preview,
        hint: "Re-send with { confirm: true } to revoke. Existing sessions survive; new sign-ins from these origins stop immediately.",
      });
    }

    const result = await ctx.runMutation(internal.apps.unregister, { slug });
    invalidateApps();
    return Response.json({
      ...result,
      // Named in the answer because re-registering restores it, and the
      // easiest way to be sure of that is to see it written down here.
      methods: preview.methods,
      hint: `Re-register "${slug}" to restore these origins and its method list.`,
    });
  }),
});

export default http;
