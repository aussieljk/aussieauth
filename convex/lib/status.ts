import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint } from "better-auth/api";

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

export const status = (probe: () => SetupStatus) =>
  ({
    id: "status",
    endpoints: {
      aussieAuthStatus: createAuthEndpoint("/aussieauth/status", { method: "GET" }, async (ctx) =>
        ctx.json(probe()),
      ),
    },
  }) satisfies BetterAuthPlugin;
