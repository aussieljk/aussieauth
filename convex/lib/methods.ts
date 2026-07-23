/**
 * Which of our sixteen methods a request represents.
 *
 * Two callers, and they must agree: `lastLoginMethod` records what you used so
 * the sign-in card can offer it again, and the per-app method allow-list
 * decides whether you were allowed to use it at all. A map that disagreed with
 * itself would either mislabel accounts or block the wrong endpoint.
 */

/** Endpoints that identify their method by path alone. */
export const LOGIN_METHOD_PATHS: Record<string, string> = {
  "/sign-in/email": "email-password",
  "/sign-up/email": "email-password",
  "/sign-in/username": "username-password",
  "/sign-in/phone-number": "phone-password",
  "/phone-number/verify": "ios-otp",
  "/sign-in/email-otp": "email-otp",
  "/magic-link/verify": "magic-link",
  "/passkey/verify-authentication": "passkey",
  "/sign-in/solana": "solana",
  "/sign-in/anonymous": "anonymous",
  "/sign-in/demo": "demo",
  "/sign-in/account-number": "account-number",
  "/sign-up/account-number": "account-number",
  "/one-tap/callback": "google-one-tap",
};

const callbackProvider = (path: string, params: unknown) => {
  if (!path.startsWith("/callback/") && !path.startsWith("/oauth2/callback/")) {
    return null;
  }
  const p = params as { id?: string; providerId?: string } | undefined;
  return p?.id ?? p?.providerId ?? path.split("/").pop() ?? null;
};

/**
 * The stock `lastLoginMethod` resolver only knows the handful Better Auth
 * ships, and answers in its own vocabulary. This covers every endpoint and
 * answers in `PROVIDERS` ids, so the card can offer a returning account the
 * exact button it used last time.
 */
export const resolveLoginMethod = (ctx: { path?: string; params?: unknown }) => {
  const path = ctx.path;
  if (!path) return null;
  return callbackProvider(path, ctx.params) ?? LOGIN_METHOD_PATHS[path] ?? null;
};

/**
 * The method a request is *asking* to use, for the allow-list check.
 *
 * Differs from `resolveLoginMethod` in one way that matters: social sign-in is
 * caught at `/sign-in/social`, where the provider is in the body, rather than
 * only at the callback. Blocking at the callback would be too late — the user
 * would already have been sent to Google and consented before we said no.
 */
export const methodForRequest = (
  path: string | undefined,
  body: unknown,
  params?: unknown,
): string | null => {
  if (!path) return null;
  if (path === "/sign-in/social" || path === "/link-social") {
    const provider = (body as { provider?: unknown } | undefined)?.provider;
    return typeof provider === "string" ? provider : null;
  }
  return callbackProvider(path, params) ?? LOGIN_METHOD_PATHS[path] ?? null;
};

/**
 * Path prefixes worth resolving at all. Cheap string test first, so the app
 * lookup only happens on requests that could actually start a sign-in.
 */
export const ENFORCEABLE_PREFIXES = [
  "/sign-in/",
  "/sign-up/",
  "/link-social",
  "/callback/",
  "/oauth2/callback/",
  "/one-tap/callback",
  "/magic-link/verify",
  "/passkey/verify-authentication",
  "/phone-number/verify",
];

export const isEnforceablePath = (path: string | undefined) =>
  Boolean(path) && ENFORCEABLE_PREFIXES.some((p) => path!.startsWith(p));
