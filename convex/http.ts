import { httpRouter } from "convex/server";
import { authComponent, createAuth, relatedOrigins } from "./auth";
import { httpAction } from "./_generated/server";

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
    const body = process.env.APPLE_DOMAIN_ASSOCIATION;
    if (!body) return new Response("Not configured", { status: 404 });
    return new Response(body, { headers: { "Content-Type": "text/plain" } });
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
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ origins: relatedOrigins() }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
