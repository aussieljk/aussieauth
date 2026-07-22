/**
 * Where a freshly minted account number is parked between sign-up and the
 * account page. Sign-up signs you straight in, so the panel that created it
 * unmounts before it can show you the number.
 */
export const PENDING_ACCOUNT_NUMBER = "aussieauth.accountNumber";

/** Accounts this browser has signed into before — see rememberedAccounts.ts. */
export const REMEMBERED_ACCOUNTS = "aussieauth.accounts";

/**
 * The two keys `crossDomainClient` owns. It can't be handed a session cookie
 * on a `.convex.site` response, so it keeps the whole jar as JSON in
 * localStorage and replays it as a `Better-Auth-Cookie` header — which is also
 * what makes a previous account restorable later.
 */
export const AUTH_COOKIE = "better-auth_cookie";
export const AUTH_SESSION_DATA = "better-auth_session_data";
