import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint } from "better-auth/api";
import { CONTRACT_GENERATION } from "./contract";

/**
 * Which methods have their credentials set on this deployment. The sign-in UI
 * badges the rest as "needs setup" instead of letting them fail on click.
 *
 * This used to be a Convex query (`api.status.setup`). It's an auth endpoint
 * now because the sign-in UI ships as a package: a consuming app has its own
 * generated Convex API and no `status.setup` in it. Every app already talks to
 * this auth server, so the auth server is the portable place to ask.
 *
 * `probe` is called per request rather than once at construction, because the
 * options are also built in contexts that have no env access.
 */
export type SetupStatus = Record<string, boolean>;

/**
 * The credential flags plus `contractGeneration`.
 *
 * One extra field on an endpoint the card already calls, rather than a second
 * round trip: see `lib/contract.ts` for what the number is for. It rides along
 * here because the alternative — a client that only learns it's out of step
 * when a call fails — is the failure this is meant to replace.
 *
 * Additive on purpose. A client built before this existed reads the flags and
 * ignores the number, and `needsSetup` only ever tests `=== false`, so a
 * number can't be mistaken for a method that needs setting up.
 */
export type StatusResponse = {
  contractGeneration: number;
  /** The credential flags. Booleans, unlike the field above. */
  [method: string]: boolean | number;
};

export const status = (probe: () => SetupStatus) =>
  ({
    id: "status",
    endpoints: {
      aussieAuthStatus: createAuthEndpoint("/aussieauth/status", { method: "GET" }, async (ctx) =>
        ctx.json({ ...probe(), contractGeneration: CONTRACT_GENERATION } satisfies StatusResponse),
      ),
    },
  }) satisfies BetterAuthPlugin;
