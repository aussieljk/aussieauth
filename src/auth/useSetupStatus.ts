import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

/**
 * Which methods this deployment actually has credentials for, so the card can
 * badge the rest as "needs setup" rather than letting them fail on click.
 *
 * The answer comes from the auth server rather than a Convex query, because
 * that's where the credentials are read in the first place — `convex/auth.ts`
 * decides which providers to register from the same env vars, so asking
 * anywhere else means keeping two lists in step.
 *
 * `undefined` until the answer lands — callers treat that as "assume fine", so
 * nothing is greyed out during the first paint and then ungreyed.
 */
export function useSetupStatus() {
  const [setup, setSetup] = useState<Record<string, boolean>>();

  useEffect(() => {
    let live = true;
    void authClient.aussieauth
      .status()
      .then(({ data }) => {
        if (live && data) setSetup(data);
      })
      // Nothing to badge if the probe can't be reached; leave it unknown.
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  return {
    setup,
    needsSetup: (id: string) => setup !== undefined && setup[id] === false,
  };
}
