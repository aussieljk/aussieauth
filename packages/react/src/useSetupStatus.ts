import { useCallback, useEffect, useState } from "react";
import { useAuthBaseURL } from "./context";

/**
 * Which methods this deployment actually has credentials for, so the card can
 * badge the rest as "needs setup" rather than letting them fail on click.
 *
 * The answer comes from the auth server rather than a Convex query, because
 * that's where the credentials are read in the first place — `convex/auth.ts`
 * decides which providers to register from the same env vars, so asking
 * anywhere else means keeping two lists in step.
 *
 * Opt-in via `enabled`: this only matters on the AussieAuth deployment's own
 * site, where you configure the thing. An app that merely embeds it (Boxpo)
 * leaves it off and never touches the endpoint.
 */

export type SetupStatus = Record<string, boolean>;

const endpoint = (baseURL: string) => `${baseURL}/api/auth/aussieauth/status`;

/**
 * Held as a promise so several mounted components share one request, and
 * cleared by `refetch` when something has changed on the server.
 *
 * Keyed by base URL rather than a single slot, so two deployments in one
 * bundle don't answer each other's probe — the whole point of the answer is
 * which credentials *that* deployment has.
 */
const pending = new Map<string, Promise<SetupStatus | undefined>>();

const probe = (baseURL: string) => {
  const cached = pending.get(baseURL);
  if (cached) return cached;
  const request = fetch(endpoint(baseURL), { credentials: "include" })
    .then((res) => (res.ok ? (res.json() as Promise<SetupStatus>) : undefined))
    // Nothing to badge if the probe can't be reached; leave it unknown.
    .catch(() => undefined);
  pending.set(baseURL, request);
  return request;
};

export function useSetupStatus(enabled = false) {
  const baseURL = useAuthBaseURL();
  /** `undefined` until the answer lands — callers read that as "assume fine", so
   *  nothing is greyed out during the first paint and then ungreyed. */
  const [setup, setSetup] = useState<SetupStatus>();

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let live = true;
    void probe(baseURL).then((data) => {
      if (live && data) setSetup(data);
    });
    return () => {
      live = false;
    };
  }, [enabled, baseURL]);

  /** Asks again, ignoring the cached answer — for after `convex env set`. */
  const refetch = useCallback(async () => {
    pending.delete(baseURL);
    const data = await probe(baseURL);
    if (data) setSetup(data);
    return data;
  }, [baseURL]);

  return {
    setup,
    refetch,
    needsSetup: (id: string) => enabled && setup !== undefined && setup[id] === false,
  };
}
