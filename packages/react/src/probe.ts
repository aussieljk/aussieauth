/**
 * Asking a deployment whether it is actually the thing the setup needs, before
 * writing a single file that assumes it is.
 *
 * The failure this exists to stop: `init` wrote an auth URL, the URL answered
 * on `/api/auth/ok`, and everything looked finished. The deployment behind it
 * was an older build with no `/apps/me`, and the app's own Convex deployment
 * has an `/api/auth/ok` of its own that answers the same way while serving no
 * auth at all. Two different wrong deployments, one identical green tick, and
 * the mistake surfaces later as a sign-in that fails for no visible reason.
 *
 * Four questions, four fetches, in one place so the CLI and `doctor` cannot
 * form different opinions about the same deployment.
 */

/**
 * The capabilities this version of the client relies on. A deployment missing
 * any of them is not broken, it is old — and the difference is the whole
 * message, because the fix is a push rather than a bug report.
 *
 * Kept short on purpose: it is a floor, not an inventory.
 */
export const REQUIRED_FEATURES = ["apps/me", "dev-origins"];

export type Probe = {
  url: string;
  /** Anything answered at all. False means wrong URL, or nothing deployed. */
  reachable: boolean;
  /** `/api/auth/ok` answered, so Better Auth is serving here. */
  servesAuth: boolean;
  /** The JWKS is published, so tokens minted here can be verified. */
  publishesKeys: boolean;
  /** `/apps/health` answered. False on any deployment older than that route. */
  health: boolean;
  features: string[];
  /** Required features this deployment does not have. */
  missing: string[];
  /** Whether a public origin could register here. Dev origins always can. */
  registrationOpen: boolean;
};

const get = async (url: string, fetchImpl: typeof fetch) => {
  try {
    return await fetchImpl(url, { headers: { accept: "application/json" } });
  } catch {
    return null;
  }
};

/**
 * What `url` is, from four public endpoints. Never throws: an unreachable
 * deployment is an answer, and the caller has a better sentence for it than a
 * `TypeError: Failed to fetch` does.
 */
export async function probeDeployment(url: string, fetchImpl: typeof fetch = fetch): Promise<Probe> {
  const base = url.replace(/\/$/, "");
  const [ok, jwks, health] = await Promise.all([
    get(`${base}/api/auth/ok`, fetchImpl),
    get(`${base}/api/auth/convex/jwks`, fetchImpl),
    get(`${base}/apps/health`, fetchImpl),
  ]);

  const body = health?.ok
    ? await health
        .json()
        .catch(() => ({}) as { features?: unknown; registrationOpen?: unknown })
    : {};
  const features = Array.isArray((body as { features?: unknown }).features)
    ? ((body as { features: unknown[] }).features.filter(
        (f): f is string => typeof f === "string",
      ) as string[])
    : [];

  return {
    url: base,
    reachable: Boolean(ok || jwks || health),
    servesAuth: Boolean(ok?.ok),
    publishesKeys: Boolean(jwks?.ok),
    health: Boolean(health?.ok),
    features,
    missing: REQUIRED_FEATURES.filter((f) => !features.includes(f)),
    registrationOpen: Boolean((body as { registrationOpen?: unknown }).registrationOpen),
  };
}

/**
 * The one sentence that names the fix, or an empty string when there is
 * nothing wrong.
 *
 * Ordered by which failure explains the others. A deployment that answers
 * nothing is not also "missing /apps/me", and saying both would bury the one
 * fact that matters.
 */
export const explainProbe = (probe: Probe): string => {
  if (!probe.reachable) {
    return (
      `${probe.url} answered nothing.\n` +
      `  Check the host is right — it must be .convex.site, not .convex.cloud —\n` +
      `  and that the deployment has been pushed (bunx convex dev --once).`
    );
  }
  if (!probe.servesAuth) {
    return (
      `${probe.url} is reachable but serves no auth.\n` +
      `  This is usually an app's own Convex deployment rather than an AussieAuth one.\n` +
      `  Use the hosted deployment, or run \`aussieauth init --self-hosted\` if this\n` +
      `  project is meant to be its own auth server.`
    );
  }
  if (!probe.publishesKeys) {
    return (
      `${probe.url} serves auth but publishes no JWKS, so nothing can verify its\n` +
      `  tokens. The deployment is half-configured; push it again and check its logs.`
    );
  }
  if (!probe.health || probe.missing.length) {
    const what = probe.health ? `is missing ${probe.missing.join(", ")}` : "has no /apps/health";
    return (
      `${probe.url} is older than this client — it ${what}.\n` +
      `  Push the AussieAuth deployment (bunx convex dev --once from the AussieAuth\n` +
      `  repo). Setting up against it now would fail later, somewhere else.`
    );
  }
  return "";
};
