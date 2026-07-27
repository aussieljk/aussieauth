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
const accountNumberClient = () =>
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

const demoClient = () =>
  ({
    id: "demo",
    $InferServerPlugin: {} as ReturnType<typeof demo>,
    pathMethods: { "/sign-in/demo": "POST" },
  }) satisfies BetterAuthClientPlugin;

const solanaClient = () =>
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

const linkingClient = () =>
  ({
    id: "linking",
    $InferServerPlugin: {} as ReturnType<typeof linking>,
    pathMethods: { "/linking/set-password": "POST" },
  }) satisfies BetterAuthClientPlugin;

const statusClient = () =>
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

/**
 * The configured auth client.
 *
 * `undefined` until {@link createAussieAuthClient} runs — call that once at your
 * app's entry, before any sign-in UI renders. It's an ESM live binding, so the
 * package's own components and `localSignOut` see the assignment.
 */
export let authClient: ReturnType<typeof build>;

/** Base URL of the configured server — read by the setup-status probe. */
export let baseURL = "";

let resolveCallback: () => string = () =>
  typeof window !== "undefined" ? `${window.location.origin}/` : "/";

/** The absolute return URL to hand a provider, resolved per call. */
export const callbackURL = () => resolveCallback();

/**
 * Build the AussieAuth client and register it as the one the package's UI uses.
 * Returns it so you can pass it to `ConvexBetterAuthProvider`.
 */
export function createAussieAuthClient(options: AussieAuthClientOptions) {
  authClient = build(options);
  baseURL = options.baseURL;
  if (options.callbackURL !== undefined) {
    const cb = options.callbackURL;
    resolveCallback = typeof cb === "function" ? cb : () => cb;
  }
  return authClient;
}
