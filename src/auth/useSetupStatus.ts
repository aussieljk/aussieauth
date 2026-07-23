import { useCallback, useEffect, useState } from "react";

/**
 * Which methods this deployment actually has credentials for, so the card can
 * badge the rest as "needs setup" rather than letting them fail on click.
 *
 * The answer comes from the auth server rather than a Convex query, because
 * that's where the credentials are read in the first place — `convex/auth.ts`
 * decides which providers to register from the same env vars, so asking
 * anywhere else means keeping two lists in step.
 */

export type SetupStatus = Record<string, boolean>;

/**
 * A bare `fetch` rather than `authClient.aussieauth.status()`.
 *
 * The endpoint is an unauthenticated GET, so the auth client buys nothing here
 * — and it costs a great deal. The setup wizards use this hook, the sign-in
 * card uses this hook, and going through the client would make all fourteen
 * Better Auth plugins a shared dependency of both: ~90 kB gzip hoisted into the
 * chunk every page loads, including the landing page and the docs.
 *
 * `VITE_CONVEX_SITE_URL` is empty in the workbench, which leaves this relative
 * and pointing at the fixture's own origin — which is what the MSW handlers
 * expect.
 */
const ENDPOINT = `${import.meta.env.VITE_CONVEX_SITE_URL ?? ""}/api/auth/aussieauth/status`;

/**
 * Started as soon as this module is imported rather than from an effect.
 * Importing happens during module evaluation and effects only run after
 * hydration, so hoisting it lets the round trip overlap the work React is doing
 * anyway instead of queueing behind it.
 *
 * Held as a promise so several mounted components share one request, and
 * cleared by `refetch` when something has changed on the server.
 */
let pending: Promise<SetupStatus | undefined> | undefined;

const probe = () =>
  (pending ??= fetch(ENDPOINT, { credentials: "include" })
    .then((res) => (res.ok ? (res.json() as Promise<SetupStatus>) : undefined))
    // Nothing to badge if the probe can't be reached; leave it unknown.
    .catch(() => undefined));

// Fired at import time. The `void` is the point: nothing awaits it, it's simply
// in flight by the time the first component wants an answer.
if (typeof window !== "undefined") void probe();

export function useSetupStatus() {
  /** `undefined` until the answer lands — callers read that as "assume fine", so
   *  nothing is greyed out during the first paint and then ungreyed. */
  const [setup, setSetup] = useState<SetupStatus>();

  useEffect(() => {
    let live = true;
    void probe().then((data) => {
      if (live && data) setSetup(data);
    });
    return () => {
      live = false;
    };
  }, []);

  /** Asks again, ignoring the cached answer — for after `convex env set`. */
  const refetch = useCallback(async () => {
    pending = undefined;
    const data = await probe();
    if (data) setSetup(data);
    return data;
  }, []);

  return {
    setup,
    refetch,
    needsSetup: (id: string) => setup !== undefined && setup[id] === false,
  };
}
