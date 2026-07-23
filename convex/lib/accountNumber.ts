import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import * as z from "zod";

/**
 * Mullvad-style accounts: signing up hands you a 16-digit number and nothing
 * else. The number *is* the credential — no email, no password, no recovery.
 *
 * The number lives in the `username` column (the username plugin already
 * defines it), so account-number users are ordinary users everywhere else.
 */

const DIGITS = 16;
/** Grouped 4-4-4-4 for display; we always store and compare the bare digits. */
export const formatAccountNumber = (n: string) => n.replace(/(\d{4})(?=\d)/g, "$1 ");
export const normalize = (n: string) => n.replace(/\D/g, "");

export const generateAccountNumber = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(DIGITS));
  // Modulo 10 on a uniform byte is very slightly biased toward 0-5. Irrelevant
  // here: 16 digits is ~53 bits and we re-roll on collision anyway.
  return Array.from(bytes, (b) => (b % 10).toString()).join("");
};

export const accountNumber = () =>
  ({
    id: "account-number",
    endpoints: {
      signUpAccountNumber: createAuthEndpoint(
        "/sign-up/account-number",
        { method: "POST" },
        async (ctx) => {
          let number = generateAccountNumber();
          for (let i = 0; i < 5; i++) {
            const taken = await ctx.context.adapter.findOne({
              model: "user",
              where: [{ field: "username", value: number }],
            });
            if (!taken) break;
            number = generateAccountNumber();
          }

          const user = await ctx.context.internalAdapter.createUser({
            // Nothing is ever sent here; it exists because `email` is required.
            email: `${number}@account.invalid`,
            emailVerified: false,
            name: formatAccountNumber(number),
            username: number,
            displayUsername: formatAccountNumber(number),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          const session = await ctx.context.internalAdapter.createSession(user.id);
          await setSessionCookie(ctx, { session, user });

          // The only time the number is ever returned. Losing it loses the
          // account — that's the point.
          return ctx.json({
            accountNumber: number,
            token: session.token,
            user,
          });
        },
      ),

      signInAccountNumber: createAuthEndpoint(
        "/sign-in/account-number",
        { method: "POST", body: z.object({ accountNumber: z.string() }) },
        async (ctx) => {
          const number = normalize(ctx.body.accountNumber);
          const user = await ctx.context.adapter.findOne<{ id: string }>({
            model: "user",
            where: [{ field: "username", value: number }],
          });
          if (!user) {
            throw new APIError("UNAUTHORIZED", {
              message: "Unknown account number",
            });
          }
          const session = await ctx.context.internalAdapter.createSession(user.id);
          const full = await ctx.context.internalAdapter.findUserById(user.id);
          await setSessionCookie(ctx, { session, user: full! });
          return ctx.json({ token: session.token, user: full });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
