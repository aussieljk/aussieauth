import type { BetterAuthPlugin } from "better-auth";
import {
  APIError,
  createAuthEndpoint,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";

/**
 * One-click sign-in to a single shared demo account. Unlike anonymous sign-in
 * every visitor lands on the *same* user, so whatever the demo has been seeded
 * with is already there.
 *
 * Which is exactly why the session it hands out is deliberately crippled — see
 * `LOCKED` below.
 */

const DEMO_EMAIL = "demo@aussieauth.com";

/** The account page imports this to explain why its controls are disabled. */
export const isDemoUser = (
  user: { email?: string | null } | null | undefined,
) => user?.email === DEMO_EMAIL;

/**
 * Endpoints a demo session may not reach, by prefix.
 *
 * A shared account handing out full sessions is a shared account waiting to be
 * stolen: the first visitor to set a password, link their own Google, or
 * register a passkey owns `demo@aussieauth.com` permanently, and every later
 * visitor lands in an account that person controls and can read. So the demo
 * session can look at things and sign out, and that's it.
 *
 * Three families, matching the three ways to take it:
 *
 *   - acquire a credential (password, passkey, API key, phone, OTP)
 *   - attach an identity (link a social account, a wallet, change the email)
 *   - lock everyone else out (revoke the other live demo sessions)
 *
 * A deny-list rather than an allow-list because the session still has to work:
 * `/get-session`, `/convex/token` and friends are what keep the visitor signed
 * in, and enumerating those correctly across plugin versions is the more
 * fragile job. Adding a method to this file means adding it here too.
 */
const LOCKED = [
  // Acquire a credential.
  "/linking/set-password",
  "/change-password",
  "/set-password",
  "/passkey/generate-register-options",
  "/passkey/verify-registration",
  "/passkey/delete-passkey",
  "/api-key/create",
  "/api-key/update",
  "/api-key/delete",
  "/phone-number/",
  "/email-otp/",
  "/two-factor/",
  // Attach an identity.
  "/change-email",
  "/update-user",
  "/delete-user",
  "/link-social",
  "/unlink-account",
  "/solana/link",
  "/solana/unlink",
  // Lock everyone else out.
  "/revoke-session",
  "/revoke-sessions",
  "/revoke-other-sessions",
];

export const isLocked = (path: string | undefined) =>
  Boolean(path) && LOCKED.some((prefix) => path!.startsWith(prefix));

export const demo = () =>
  ({
    id: "demo",

    hooks: {
      before: [
        {
          // Cheap string test first, so the session lookup only happens on the
          // handful of paths that could actually do damage.
          matcher: (ctx) => isLocked(ctx.path),
          handler: createAuthMiddleware(async (ctx) => {
            const session = await getSessionFromCtx(ctx);
            if (session?.user?.email !== DEMO_EMAIL) return;
            throw new APIError("FORBIDDEN", {
              message:
                "The demo account is shared and read-only. Sign up for your own account to change this.",
            });
          }),
        },
      ],
    },

    endpoints: {
      signInDemo: createAuthEndpoint(
        "/sign-in/demo",
        { method: "POST" },
        async (ctx) => {
          const existing =
            await ctx.context.internalAdapter.findUserByEmail(DEMO_EMAIL);
          const user =
            existing?.user ??
            (await ctx.context.internalAdapter.createUser({
              email: DEMO_EMAIL,
              emailVerified: true,
              name: "Demo User",
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

          const session = await ctx.context.internalAdapter.createSession(
            user.id,
          );
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ token: session.token, user });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
