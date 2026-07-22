import { apiKeyClient } from "@better-auth/api-key/client";
import { passkeyClient } from "@better-auth/passkey/client";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import type { BetterAuthClientPlugin } from "better-auth/client";
import {
  anonymousClient,
  emailOTPClient,
  magicLinkClient,
  oneTapClient,
  phoneNumberClient,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { accountNumber } from "@/convex/lib/accountNumber";
import type { demo } from "@/convex/lib/demo";
import type { solana } from "@/convex/lib/solana";

/**
 * Client halves of the plugins we wrote ourselves. They carry no runtime
 * behaviour — the server plugin's type is all `createAuthClient` needs to
 * expose `signIn.demo()` and friends with real types.
 */
const accountNumberClient = () =>
  ({
    id: "account-number",
    $InferServerPlugin: {} as ReturnType<typeof accountNumber>,
  }) satisfies BetterAuthClientPlugin;

const demoClient = () =>
  ({
    id: "demo",
    $InferServerPlugin: {} as ReturnType<typeof demo>,
  }) satisfies BetterAuthClientPlugin;

const solanaClient = () =>
  ({
    id: "solana",
    $InferServerPlugin: {} as ReturnType<typeof solana>,
  }) satisfies BetterAuthClientPlugin;

/**
 * Points straight at the Convex deployment. An app embedding AussieAuth uses
 * this exact client from its own origin — there's no AussieAuth-hosted page in
 * the middle, so the only consent screen a user ever sees is the provider's.
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_CONVEX_SITE_URL,
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
    apiKeyClient(),
    // Registered unconditionally so the client's type stays stable; the UI
    // hides the One Tap entry when there's no client id to prompt with.
    oneTapClient({
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "",
      promptOptions: { maxAttempts: 1 },
    }),
    crossDomainClient(),
    convexClient(),
  ],
});
