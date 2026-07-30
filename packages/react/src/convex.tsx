import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { type ReactNode, useMemo } from "react";
import {
  type AussieAuthClient,
  type AussieAuthClientOptions,
  createAussieAuthClient,
} from "./client";
import { AussieAuthClientProvider } from "./context";
import { siteUrlFromConvexUrl } from "./deployment";
import { readEnv } from "./env";

/**
 * The web twin of `@aussieljk/auth/expo`'s provider.
 *
 * Expo has had one since it shipped: an auth URL, a Convex URL, and it builds
 * both clients. The web had no counterpart, so every web app assembled the
 * same three objects by hand — and had to know the non-obvious part, which is
 * that the auth client goes to `ConvexBetterAuthProvider` rather than to the
 * Convex client:
 *
 * ```tsx
 * // what this replaces
 * const auth = createAussieAuthClient({ baseURL });
 * const convex = new ConvexReactClient(convexUrl);
 * <ConvexBetterAuthProvider client={convex} authClient={auth}>
 * ```
 *
 * Two entry points solving the same problem in two different shapes costs a
 * reader more than either shape costs on its own.
 *
 * **It lives on its own subpath, not the root entry, and that's deliberate.**
 * The card talks to the auth server over plain HTTP and imports no Convex, so
 * it works in an app that has none. Putting this in `index.ts` would make
 * `convex` a hard import of the root entry and take that away.
 */

/** Where the deployment is, as each web bundler spells it. */
const CONVEX_URL_VARS = [
  "VITE_CONVEX_URL",
  "NEXT_PUBLIC_CONVEX_URL",
  "PUBLIC_CONVEX_URL",
  "CONVEX_URL",
];

/**
 * The auth server's URL — the `.convex.site` one.
 *
 * Derived from the Convex URL when nothing names it, because the two differ by
 * one word and only one of them serves auth. `.convex.cloud` is the websocket
 * API and `.convex.site` is the HTTP router; pointing the auth client at the
 * former produces a network error with no response body, which is the single
 * most common way to fail a first integration. Better to compute it than to
 * ask someone to type it.
 */
const AUTH_URL_VARS = [
  "VITE_AUSSIEAUTH_URL",
  "NEXT_PUBLIC_AUSSIEAUTH_URL",
  "PUBLIC_AUSSIEAUTH_URL",
  "AUSSIEAUTH_URL",
  "VITE_CONVEX_SITE_URL",
  "NEXT_PUBLIC_CONVEX_SITE_URL",
];

export { siteUrlFromConvexUrl } from "./deployment";

const missing = (name: string, vars: string[]) =>
  new Error(
    `${name} is required for <AussieAuthProvider>. Pass it explicitly, or set one of: ${vars.join(", ")}.`,
  );

export type AussieAuthProviderProps = {
  children: ReactNode;
  /**
   * The AussieAuth deployment's `.convex.site` origin. Defaults to
   * `VITE_AUSSIEAUTH_URL` / `NEXT_PUBLIC_AUSSIEAUTH_URL`, then to the Convex
   * URL with `.convex.cloud` swapped for `.convex.site`.
   */
  authUrl?: string;
  /** Defaults to `VITE_CONVEX_URL` / `NEXT_PUBLIC_CONVEX_URL`. */
  convexUrl?: string;
  /** Where a provider returns after sign-in. Defaults to this origin's root. */
  callbackURL?: AussieAuthClientOptions["callbackURL"];
  /** Bring your own clients when you need full control over either. */
  authClient?: AussieAuthClient;
  convexClient?: ConvexReactClient;
};

/**
 * One provider for the usual web setup: the AussieAuth client, Convex, and the
 * context the card reads its client from.
 *
 * Composed over `AussieAuthClientProvider` rather than replacing it, so the
 * escape hatch stays — pass `authClient` and this is a wiring convenience
 * rather than a decision.
 */
export function AussieAuthProvider({
  children,
  authUrl,
  convexUrl = readEnv(...CONVEX_URL_VARS),
  callbackURL,
  authClient,
  convexClient,
}: AussieAuthProviderProps) {
  const resolvedAuthUrl =
    authUrl || readEnv(...AUTH_URL_VARS) || (convexUrl ? siteUrlFromConvexUrl(convexUrl) : "");

  if (!resolvedAuthUrl && !authClient) throw missing("authUrl", AUTH_URL_VARS);
  if (!convexUrl && !convexClient) throw missing("convexUrl", CONVEX_URL_VARS);

  // Both memoised on the values they're built from, not on a rest object: a
  // rest object is a new identity every render, and a rebuilt auth client is a
  // dropped session. Same reasoning as the Expo provider.
  const auth = useMemo(
    () => authClient ?? createAussieAuthClient({ baseURL: resolvedAuthUrl, callbackURL }),
    [authClient, resolvedAuthUrl, callbackURL],
  );
  const convex = useMemo(
    () => convexClient ?? new ConvexReactClient(convexUrl),
    [convexClient, convexUrl],
  );

  return (
    <ConvexBetterAuthProvider client={convex} authClient={auth as never}>
      <AussieAuthClientProvider client={auth} baseURL={resolvedAuthUrl} callbackURL={callbackURL}>
        {children}
      </AussieAuthClientProvider>
    </ConvexBetterAuthProvider>
  );
}
