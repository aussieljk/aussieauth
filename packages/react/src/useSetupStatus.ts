import { useCallback, useEffect, useState } from "react";
import { useAuthBaseURL } from "./context";
import { isDevelopment } from "./env";
import { CONTRACT_GENERATION } from "./server-plugins/contract";

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
 * The raw endpoint answer: credential flags, plus the deployment's contract
 * generation riding along on the same request.
 *
 * `contractGeneration` is optional because a deployment older than that field
 * simply won't send one, and "can't tell" has to stay distinguishable from
 * "disagrees" — warning about a mismatch we can't actually see would be worse
 * than not warning.
 */
type StatusPayload = {
  contractGeneration?: number;
  [method: string]: boolean | number | undefined;
};

/**
 * Held as a promise so several mounted components share one request, and
 * cleared by `refetch` when something has changed on the server.
 *
 * Keyed by base URL rather than a single slot, so two deployments in one
 * bundle don't answer each other's probe — the whole point of the answer is
 * which credentials *that* deployment has.
 */
const pending = new Map<string, Promise<StatusPayload | undefined>>();

/**
 * Deployments already warned about, so a mismatch costs one console line
 * rather than one per mounted card.
 */
const warned = new Set<string>();

/**
 * Say something when the package and the deployment disagree.
 *
 * The published client infers its types from copies of the server plugins, so
 * it is correct exactly as long as the deployment is running the same
 * generation of them. When it isn't, nothing complains: the types keep
 * compiling and describe a server that no longer exists. That's the failure
 * most likely to arrive as an unexplainable bug report, because the compiler
 * is on the wrong side of it.
 *
 * Development only. In production the app has already shipped against whatever
 * it shipped against, and a console line in a user's browser helps nobody.
 */
const checkContract = (baseURL: string, generation: number | undefined) => {
  if (generation === undefined || generation === CONTRACT_GENERATION) return;
  if (!isDevelopment() || warned.has(baseURL)) return;
  warned.add(baseURL);
  console.warn(
    `[AussieAuth] This @aussieljk/auth build speaks contract generation ${CONTRACT_GENERATION}; ` +
      `${baseURL} is running generation ${generation}. The types will still compile and may ` +
      `describe endpoints that deployment no longer offers. ` +
      (generation > CONTRACT_GENERATION
        ? "Update the package: bun add @aussieljk/auth@latest"
        : "Deploy the AussieAuth backend: bunx convex deploy"),
  );
};

const probe = (baseURL: string) => {
  const cached = pending.get(baseURL);
  if (cached) return cached;
  const request = fetch(endpoint(baseURL), { credentials: "include" })
    .then((res) => (res.ok ? (res.json() as Promise<StatusPayload>) : undefined))
    .then((body) => {
      if (body) checkContract(baseURL, body.contractGeneration);
      return body;
    })
    // Nothing to badge if the probe can't be reached; leave it unknown.
    .catch(() => undefined);
  pending.set(baseURL, request);
  return request;
};

/**
 * The credential flags on their own.
 *
 * Filtered by type rather than by name: `needsSetup` only ever tests
 * `=== false`, so a stray number is harmless — but a `SetupStatus` that isn't
 * actually `Record<string, boolean>` is a lie the next reader has to check,
 * and this stays right if the endpoint grows a second non-boolean field.
 */
const flagsOnly = (payload: StatusPayload): SetupStatus =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => typeof value === "boolean"),
  ) as SetupStatus;

export function useSetupStatus(enabled = false) {
  const baseURL = useAuthBaseURL();
  /** `undefined` until the answer lands — callers read that as "assume fine", so
   *  nothing is greyed out during the first paint and then ungreyed. */
  const [setup, setSetup] = useState<SetupStatus>();

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let live = true;
    void probe(baseURL).then((data) => {
      if (live && data) setSetup(flagsOnly(data));
    });
    return () => {
      live = false;
    };
  }, [enabled, baseURL]);

  /** Asks again, ignoring the cached answer — for after `convex env set`. */
  const refetch = useCallback(async () => {
    pending.delete(baseURL);
    const data = await probe(baseURL);
    const flags = data && flagsOnly(data);
    if (flags) setSetup(flags);
    return flags;
  }, [baseURL]);

  return {
    setup,
    refetch,
    needsSetup: (id: string) => enabled && setup !== undefined && setup[id] === false,
  };
}

/**
 * Check the deployment's contract generation without mounting anything.
 *
 * The hook does this as a side effect of the probe it already makes, which
 * covers the card. This is for an app that renders its own UI and would
 * otherwise never ask — call it once at your entry.
 */
export async function verifyAussieAuthContract(baseURL: string) {
  const body = await probe(baseURL);
  return {
    package: CONTRACT_GENERATION,
    deployment: body?.contractGeneration,
    matches: body?.contractGeneration === CONTRACT_GENERATION,
  };
}
