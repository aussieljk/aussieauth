import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
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

export default http;
