import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";

/**
 * One-click sign-in to a single shared demo account. Unlike anonymous sign-in
 * every visitor lands on the *same* user, so whatever the demo has been seeded
 * with is already there.
 */

const DEMO_EMAIL = "demo@aussieauth.com";

export const demo = () =>
  ({
    id: "demo",
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
