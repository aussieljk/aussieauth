import { defineApp } from "convex/server";
import { v } from "convex/values";
// Local install of the Better Auth component — we own the schema so we can use
// plugins that add tables (passkey, api keys, wallet addresses).
import betterAuth from "./betterAuth/convex.config";

/**
 * Every environment variable this deployment reads, declared so the backend
 * gets `env.GOOGLE_CLIENT_ID` instead of `process.env.GOOGLE_CLIENT_ID`: a typo
 * is a type error, and a value that doesn't validate is rejected when it's set
 * rather than when it's read.
 *
 * Almost all of it is optional on purpose. A method whose credentials are
 * missing is a method this deployment doesn't offer — `available` in
 * convex/auth.ts is built from exactly these checks, and it's what the sign-in
 * card greys out. Marking any of them required would turn "Google isn't set up
 * here" into a failed push.
 *
 * `CONVEX_SITE_URL` is deliberately absent: Convex sets it, so there's nothing
 * to declare and no way to set it. It stays on `process.env`.
 */
const app = defineApp({
  env: {
    // The one exception to the rule above. This signs every session, and an
    // unset secret isn't a feature switched off — it's Better Auth falling back
    // to something that shouldn't reach a request. Fail the push instead. Read
    // by Better Auth itself rather than by any of our code.
    BETTER_AUTH_SECRET: v.string(),

    // Where the browser is, for callback URLs. Falls back to the Vite dev
    // server, so a local deployment needs nothing set.
    SITE_URL: v.optional(v.string()),
    // Comma-separated origins allowed to call this deployment. Only the
    // bootstrap set — registered apps add their own at runtime.
    TRUSTED_ORIGINS: v.optional(v.string()),

    // Social providers. Each is offered only once its pair is complete.
    GOOGLE_CLIENT_ID: v.optional(v.string()),
    GOOGLE_CLIENT_SECRET: v.optional(v.string()),
    GITHUB_CLIENT_ID: v.optional(v.string()),
    GITHUB_CLIENT_SECRET: v.optional(v.string()),

    // Apple needs all four to mint the JWT it takes as a client secret.
    APPLE_CLIENT_ID: v.optional(v.string()),
    APPLE_TEAM_ID: v.optional(v.string()),
    APPLE_KEY_ID: v.optional(v.string()),
    APPLE_PRIVATE_KEY: v.optional(v.string()),
    // Only used by native iOS apps signing in with an id token.
    APPLE_APP_BUNDLE_IDENTIFIER: v.optional(v.string()),
    // Verbatim file bodies served from /.well-known. Unset means 404, which is
    // the honest answer — see the routes in convex/http.ts.
    APPLE_DOMAIN_ASSOCIATION: v.optional(v.string()),
    APPLE_APP_SITE_ASSOCIATION: v.optional(v.string()),

    // Email, for magic links and emailed OTP codes.
    RESEND_API_KEY: v.optional(v.string()),
    EMAIL_FROM: v.optional(v.string()),

    // SMS, for phone OTP codes. All three or none.
    MOBILE_MESSAGE_API_USERNAME: v.optional(v.string()),
    MOBILE_MESSAGE_API_PASSWORD: v.optional(v.string()),
    MOBILE_MESSAGE_SENDER: v.optional(v.string()),

    // Bearer secret for /apps/register. Unset means registration is closed,
    // which those routes answer with a 503 rather than accepting anything.
    AUSSIEAUTH_SECRET: v.optional(v.string()),

    // Whose signed-in email may read `/admin`. Unset means nobody's.
    ADMIN_EMAIL: v.optional(v.string()),
  },
});

app.use(betterAuth);

export default app;
