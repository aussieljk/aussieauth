import { apiKeyClient } from "@better-auth/api-key/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins";
import type { BetterAuthClientPlugin } from "better-auth/client";
import {
  anonymousClient,
  emailOTPClient,
  magicLinkClient,
  phoneNumberClient,
  twoFactorClient,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
// Type-only. These are AussieAuth's own server plugins; the client needs their
// types to expose `signIn.demo()`, `solana.challenge()` and friends with real
// signatures. `import type` keeps every byte of their runtime out of the bundle
// — they're referenced only in type position below.
import type { accountNumber } from "./server-plugins/accountNumber";
import type { demo } from "./server-plugins/demo";
import type { linking } from "./server-plugins/linking";
import type { solana } from "./server-plugins/solana";
import type { status } from "./server-plugins/status";

/**
 * Client halves of the plugins AussieAuth wrote itself. They carry no runtime
 * behaviour — the server plugin's type is all `createAuthClient` needs to
 * expose `signIn.demo()` and friends with real types.
 */
export const accountNumberClient = () =>
  ({
    id: "account-number",
    $InferServerPlugin: {} as ReturnType<typeof accountNumber>,
    pathMethods: {
      // Without this the client guesses from the arguments, and a call with no
      // body — `signUp.accountNumber()` — would go out as a GET.
      "/sign-up/account-number": "POST",
      "/sign-in/account-number": "POST",
    },
  }) satisfies BetterAuthClientPlugin;

export const demoClient = () =>
  ({
    id: "demo",
    $InferServerPlugin: {} as ReturnType<typeof demo>,
    pathMethods: { "/sign-in/demo": "POST" },
  }) satisfies BetterAuthClientPlugin;

export const solanaClient = () =>
  ({
    id: "solana",
    $InferServerPlugin: {} as ReturnType<typeof solana>,
    pathMethods: {
      "/solana/challenge": "POST",
      "/sign-in/solana": "POST",
      "/solana/link": "POST",
      "/solana/unlink": "POST",
    },
  }) satisfies BetterAuthClientPlugin;

export const linkingClient = () =>
  ({
    id: "linking",
    $InferServerPlugin: {} as ReturnType<typeof linking>,
    pathMethods: { "/linking/set-password": "POST" },
  }) satisfies BetterAuthClientPlugin;

export const statusClient = () =>
  ({
    id: "status",
    $InferServerPlugin: {} as ReturnType<typeof status>,
    pathMethods: { "/aussieauth/status": "GET" },
  }) satisfies BetterAuthClientPlugin;

export type AussieAuthClientOptions = {
  /** The AussieAuth deployment's origin — its `.convex.site` URL. */
  baseURL: string;
  /**
   * Where a provider drops the user once sign-in is done. A string, or a
   * function evaluated per call (so it can read `window.location`). Defaults to
   * the current origin's root.
   */
  callbackURL?: string | (() => string);
};

// Built through a named function so `authClient`'s type is exactly the client
// this plugin set produces — every `authClient.*` call downstream stays typed.
const build = (options: AussieAuthClientOptions) =>
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
      crossDomainClient(),
      convexClient(),
    ],
  });

export type AussieAuthClient = ReturnType<typeof build>;

/**
 * The client `createAussieAuthClient` last built, for the code that can't take
 * one as an argument.
 *
 * Components should reach for `useAuthClient()` instead — it reads from
 * `<AussieAuthClientProvider>` and so works with more than one deployment in a
 * bundle, and doesn't depend on module evaluation order. This is the fallback
 * that hook falls back *to*, and the only thing available to the imperative
 * helpers (`localSignOut`, `restoreRemembered`) which run from event handlers
 * where there are no hooks to call.
 */
let configured: AussieAuthClient | null = null;

/** The configured client, or a message explaining what to do about it. */
export function requireAuthClient(): AussieAuthClient {
  if (!configured) {
    throw new Error(
      "AussieAuth has no client yet. Call createAussieAuthClient({ baseURL }) once " +
        "at your app's entry — before any sign-in UI renders — or wrap the tree in " +
        "<AussieAuthClientProvider client={...}>.",
    );
  }
  return configured;
}

/**
 * The configured client, as a value you can hold onto.
 *
 * A proxy rather than the client itself, because it's imported at module scope
 * all over the place and `createAussieAuthClient` hasn't necessarily run yet
 * when that import is evaluated. It used to be a bare `let`, which meant every
 * such read landed on `undefined` and failed later as
 * "cannot read properties of undefined (reading 'signIn')" — pointing at the
 * call site rather than at the missing setup. Now it says what to do.
 */
export const authClient: AussieAuthClient = new Proxy({} as AussieAuthClient, {
  // Forwarded untouched, and deliberately not bound. Better Auth's client is
  // itself a proxy that returns callable proxies for paths it hasn't seen —
  // `signIn` is one of those, and `.bind()`ing it produces an ordinary
  // function that has lost the `get` trap `signIn.email` depends on. Reading
  // through means `this` is this proxy rather than the client, which forwards
  // here again and lands in the same place.
  get: (_target, property) => Reflect.get(requireAuthClient(), property) as unknown,
  has: (_target, property) => Reflect.has(requireAuthClient(), property),
});

/** Base URL of the configured server — read by the setup-status probe. */
export let baseURL = "";

const originCallback = () =>
  typeof window !== "undefined" ? `${window.location.origin}/` : "/";

let resolveCallback: () => string = originCallback;

/** The absolute return URL to hand a provider, resolved per call. */
export const callbackURL = () => resolveCallback();

/** Normalises the two shapes `callbackURL` may be given into one function. */
export const toCallbackResolver = (
  callback: AussieAuthClientOptions["callbackURL"],
): (() => string) => {
  if (callback === undefined) return originCallback;
  return typeof callback === "function" ? callback : () => callback;
};

/**
 * Build the AussieAuth client and register it as the one the package's UI uses.
 * Returns it so you can pass it to `ConvexBetterAuthProvider`.
 */
export function configureAussieAuthClientState(
  client: ReturnType<typeof createAuthClient>,
  options: AussieAuthClientOptions,
) {
  configured = client as AussieAuthClient;
  baseURL = options.baseURL;
  if (options.callbackURL !== undefined) {
    resolveCallback = toCallbackResolver(options.callbackURL);
  }
}

export function createAussieAuthClient(options: AussieAuthClientOptions) {
  const client = build(options);
  configureAussieAuthClientState(client, options);
  return client;
}
