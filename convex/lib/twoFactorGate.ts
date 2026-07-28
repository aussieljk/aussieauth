import type { BetterAuthPlugin } from "better-auth";

/**
 * Puts AussieAuth's own sign-in endpoints behind the two-factor challenge.
 *
 * Better Auth interposes that challenge from an `after` hook whose matcher
 * names exactly three paths — `/sign-in/email`, `/sign-in/username`,
 * `/sign-in/phone-number`. Every sign-in endpoint written in this directory
 * mints its session the same way those three do (`setSessionCookie`, which is
 * what sets `ctx.context.newSession`), but under a path that matcher doesn't
 * name. So a user who turned on TOTP was asked for it at the password door and
 * waved straight through the others.
 *
 * It matters most for account numbers, where the sixteen digits are the entire
 * credential and the second factor is the only thing standing behind them.
 *
 * This widens the matcher rather than reimplementing the challenge, so the
 * hook body — deleting the session it just found, issuing the 2FA cookie and
 * the attempts counter, honouring a trusted device, deciding which methods to
 * offer — stays owned by Better Auth and stays correct when Better Auth
 * changes it. The response our endpoint returned is replaced by the hook's
 * `{ twoFactorRedirect: true }`, which is the same answer a password sign-in
 * gives and which the card already knows how to handle.
 */

/**
 * The paths to widen it to.
 *
 * Both are endpoints where an *existing* user can come back: a wallet that
 * signed before, an account number that was issued earlier. The ones left out
 * are left out because there is no enrolled second factor to skip —
 * `/sign-up/account-number` and `/sign-in/anonymous` mint a brand new user, and
 * the demo account is refused `/two-factor/` outright by the deny-list in
 * `demo.ts`, so it can never have one.
 */
export const TWO_FACTOR_PATHS = ["/sign-in/solana", "/sign-in/account-number"];

/**
 * The hook we widen is identified by behaviour rather than by position: it's
 * the one already gating password sign-in. Naming an index would silently pick
 * the wrong hook the day Better Auth adds another.
 */
const isSignInGate = (matcher: (ctx: never) => boolean) =>
  matcher({ path: "/sign-in/email" } as never);

export const gateTwoFactor = (plugin: BetterAuthPlugin): BetterAuthPlugin => {
  const after = plugin.hooks?.after ?? [];
  const widened = after.map((hook) =>
    isSignInGate(hook.matcher)
      ? {
          ...hook,
          matcher: (ctx: Parameters<typeof hook.matcher>[0]) =>
            hook.matcher(ctx) || (!!ctx.path && TWO_FACTOR_PATHS.includes(ctx.path)),
        }
      : hook,
  );

  // Loudly, on the push that upgrades Better Auth — not quietly, on the first
  // sign-in that skips a second factor. If the hook this is written against
  // ever stops existing, the gap it closes reopens with no other symptom.
  if (widened.every((hook, i) => hook === after[i])) {
    throw new Error(
      "twoFactorGate: no sign-in hook to widen. Better Auth's two-factor plugin " +
        "changed shape, and the custom sign-in endpoints are no longer gated.",
    );
  }

  return { ...plugin, hooks: { ...plugin.hooks, after: widened } };
};
