import { expoClient } from "@better-auth/expo/client";
import { apiKeyClient } from "@better-auth/api-key/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins";
import { ConvexReactClient } from "convex/react";
import { type ReactNode, useMemo } from "react";
import { Redirect } from "expo-router";
import {
  anonymousClient,
  emailOTPClient,
  magicLinkClient,
  phoneNumberClient,
  twoFactorClient,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import {
  accountNumberClient,
  type AussieAuthClientOptions,
  configureAussieAuthClientState,
  demoClient,
  linkingClient,
  solanaClient,
  statusClient,
} from "./client";

type ExpoClientOptions = Parameters<typeof expoClient>[0];
type SessionResult = ReturnType<ReturnType<typeof createAuthClient>["useSession"]>;

const missing = (name: string) =>
  new Error(
    `${name} is required for AussieAuth Expo setup. Pass it explicitly or set the matching EXPO_PUBLIC_* environment variable.`,
  );

export function explainAussieAuthExpoError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes("scheme not found")) {
    return "AussieAuth could not find an Expo scheme. Set expo.scheme in app.json or pass scheme to createAussieAuthExpoClient.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network request failed")) {
    return "AussieAuth could not reach the auth server. Check EXPO_PUBLIC_AUSSIEAUTH_URL and the device's network access.";
  }
  if (lower.includes("cors") || lower.includes("origin") || lower.includes("trusted")) {
    return "This app origin is not registered with AussieAuth. Run `aussieauth apps register --scheme <scheme>` and include `--dev-exp` for Expo Go.";
  }
  if (lower.includes("convex") && lower.includes("auth")) {
    return "Convex is not receiving an AussieAuth token. Wrap the app in AussieAuthProvider or ConvexBetterAuthProvider with the AussieAuth client.";
  }
  return message;
}

const readEnv = (name: string) => {
  const env = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return env.process?.env?.[name] ?? "";
};

const normalizeScheme = (scheme: string | undefined) => {
  if (!scheme) return undefined;
  return scheme.replace(/:\/?\/?$/, "");
};

const defaultCallback = (scheme: string | undefined) => (scheme ? `${scheme}://` : undefined);

export type AussieAuthExpoClientOptions = Omit<AussieAuthClientOptions, "callbackURL"> & {
  /**
   * Your Expo deep-link scheme from app.json/app.config.ts. When omitted,
   * Better Auth's Expo plugin will try to read it from Expo Constants.
   */
  scheme?: string;
  /**
   * Session and cookie storage. In Expo apps this is usually:
   *
   * `import * as SecureStore from "expo-secure-store";`
   */
  storage: ExpoClientOptions["storage"];
  /**
   * Where providers should return after sign-in. Defaults to `${scheme}://`
   * when a scheme is provided. Expo Router apps often use
   * `${scheme}://auth/callback`.
   */
  callbackURL?: AussieAuthClientOptions["callbackURL"];
  /** Prefix for native session/cookie storage keys. Defaults to "aussieauth". */
  storagePrefix?: ExpoClientOptions["storagePrefix"];
  /** Better Auth cookie prefix to persist from Set-Cookie headers. */
  cookiePrefix?: ExpoClientOptions["cookiePrefix"];
  /** Disable the native session cache while still persisting cookies. */
  disableCache?: ExpoClientOptions["disableCache"];
  /** Passed through to Expo WebBrowser auth-session calls. */
  webBrowserOptions?: ExpoClientOptions["webBrowserOptions"];
};

const buildExpoClient = (
  options: Omit<AussieAuthExpoClientOptions, "callbackURL"> & {
    callbackURL: AussieAuthClientOptions["callbackURL"];
  },
): ReturnType<typeof createAuthClient> =>
  createAuthClient({
    baseURL: options.baseURL,
    plugins: [
      usernameClient(),
      phoneNumberClient(),
      magicLinkClient(),
      emailOTPClient(),
      passkeyClient(),
      solanaClient(),
      anonymousClient(),
      accountNumberClient(),
      demoClient(),
      linkingClient(),
      statusClient(),
      apiKeyClient(),
      twoFactorClient(),
      expoClient({
        scheme: options.scheme,
        storage: options.storage,
        storagePrefix: options.storagePrefix,
        cookiePrefix: options.cookiePrefix,
        disableCache: options.disableCache,
        webBrowserOptions: options.webBrowserOptions,
      }),
      crossDomainClient(),
      convexClient(),
    ],
  });

export type AussieAuthExpoClient = ReturnType<typeof buildExpoClient>;

/**
 * Create an AussieAuth client for Expo / React Native.
 *
 * The returned client is the normal AussieAuth Better Auth client plus the
 * native Expo cookie/session bridge. Pass it to `ConvexBetterAuthProvider`
 * alongside your `ConvexReactClient` when the app uses Convex.
 */
export function createAussieAuthExpoClient({
  scheme,
  storage,
  callbackURL,
  storagePrefix = "aussieauth",
  cookiePrefix,
  disableCache,
  webBrowserOptions,
  ...options
}: AussieAuthExpoClientOptions): AussieAuthExpoClient {
  if (!options.baseURL) throw missing("baseURL");
  if (!storage) throw missing("storage");

  const normalizedScheme = normalizeScheme(scheme);
  const resolvedCallback = callbackURL ?? defaultCallback(normalizedScheme);
  const client = buildExpoClient({
    ...options,
    callbackURL: resolvedCallback,
    scheme: normalizedScheme,
    storage,
    storagePrefix,
    cookiePrefix,
    disableCache,
    webBrowserOptions,
  });
  configureAussieAuthClientState(client, {
    ...options,
    callbackURL: resolvedCallback,
  });
  return client;
}

export type AussieAuthProviderProps = Omit<AussieAuthExpoClientOptions, "baseURL"> & {
  children: ReactNode;
  /** Defaults to EXPO_PUBLIC_AUSSIEAUTH_URL, then EXPO_PUBLIC_AUSSIEAUTH_SITE_URL. */
  authUrl?: string;
  /** Defaults to EXPO_PUBLIC_CONVEX_URL. */
  convexUrl?: string;
  /** Pass existing clients when you need full control. */
  authClient?: AussieAuthExpoClient;
  convexClient?: ConvexReactClient;
};

/**
 * One provider for the usual Expo app setup: AussieAuth client + Convex auth.
 */
export function AussieAuthProvider({
  children,
  authUrl = readEnv("EXPO_PUBLIC_AUSSIEAUTH_URL") || readEnv("EXPO_PUBLIC_AUSSIEAUTH_SITE_URL"),
  convexUrl = readEnv("EXPO_PUBLIC_CONVEX_URL"),
  authClient,
  convexClient: providedConvex,
  scheme,
  storage,
  callbackURL,
  storagePrefix,
  cookiePrefix,
  disableCache,
  webBrowserOptions,
}: AussieAuthProviderProps) {
  if (!authUrl && !authClient) throw missing("authUrl");
  if (!convexUrl && !providedConvex) throw missing("convexUrl");

  // Destructured rather than kept as a rest object, because a rest object is a
  // new identity on every render — the memo below would have rebuilt the auth
  // client each time, and a rebuilt client is a dropped session. These are the
  // values it actually depends on.
  const auth = useMemo(
    () =>
      authClient ??
      createAussieAuthExpoClient({
        baseURL: authUrl,
        scheme,
        storage,
        callbackURL,
        storagePrefix,
        cookiePrefix,
        disableCache,
        webBrowserOptions,
      }),
    [
      authClient,
      authUrl,
      scheme,
      storage,
      callbackURL,
      storagePrefix,
      cookiePrefix,
      disableCache,
      webBrowserOptions,
    ],
  );
  const convex = useMemo(
    () => providedConvex ?? new ConvexReactClient(convexUrl),
    [providedConvex, convexUrl],
  );

  return (
    <ConvexBetterAuthProvider client={convex} authClient={auth as never}>
      {children}
    </ConvexBetterAuthProvider>
  );
}

export function useAussieSession(authClient: AussieAuthExpoClient): SessionResult {
  return authClient.useSession();
}

export function useAussieUser(authClient: AussieAuthExpoClient) {
  const session = authClient.useSession();
  return {
    ...session,
    user: session.data?.user ?? null,
    session: session.data?.session ?? null,
  };
}

export function RequireAuth({
  authClient,
  redirectTo = "/sign-in",
  children,
}: {
  authClient: AussieAuthExpoClient;
  redirectTo?: string;
  children: ReactNode;
}) {
  const session = authClient.useSession();
  if (session.isPending) return null;
  if (!session.data?.session) return <RedirectTo href={redirectTo} />;
  return <>{children}</>;
}

export function RedirectIfSignedIn({
  authClient,
  redirectTo = "/",
  children,
}: {
  authClient: AussieAuthExpoClient;
  redirectTo?: string;
  children: ReactNode;
}) {
  const session = authClient.useSession();
  if (session.isPending) return null;
  if (session.data?.session) return <RedirectTo href={redirectTo} />;
  return <>{children}</>;
}

export async function signOutAndRedirect(
  authClient: AussieAuthExpoClient,
  redirect: (href: string) => void,
  href = "/sign-in",
) {
  await authClient.signOut();
  redirect(href);
}

function RedirectTo({ href }: { href: string }) {
  return <Redirect href={href} />;
}
