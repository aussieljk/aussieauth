#!/usr/bin/env bun
/**
 * Writes `vercel.json` from one deployment URL.
 *
 * Four paths have to be served from `aussieauth.com` but answered by the Convex
 * deployment, and each rewrite spelled the deployment's hostname out again —
 * four copies of a value that changes when you move deployments, in a file
 * nothing typechecks. Moving deployment meant remembering all four.
 *
 * Vercel reads `vercel.json` from the repository before it runs any build, so
 * the file has to be committed rather than generated during one. That makes
 * this a generator plus a check:
 *
 *   bun run vercel:config           # write it
 *   bun run vercel:config --check   # fail if it's stale (CI runs this)
 *
 * The URL comes from `VITE_CONVEX_SITE_URL`, which is the same variable the
 * app talks to and which `convex dev` writes into `.env.local` — so pointing
 * at a different deployment is one edit, in the place you were already editing.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = join(root, "vercel.json");

/**
 * The paths that must appear to live on our own domain.
 *
 * Each has a third party on the other end that refuses to look anywhere else:
 * Apple checks the domain registered to the Services ID, and a browser fetches
 * the WebAuthn related-origins file from the passkey's rpID.
 */
export const PROXIED_PATHS = [
  // Apple only accepts a return URL on a domain registered to the Services ID,
  // and the Convex hostname isn't one.
  "/api/auth/callback/apple",
  // Apple's proof that we own this domain.
  "/.well-known/apple-developer-domain-association.txt",
  // Lets a native iOS app use a passkey with this rpID, and opens magic links
  // in the app instead of Safari.
  "/.well-known/apple-app-site-association",
  // The origins allowed to use our passkeys. The browser fetches it from the
  // rpID's own domain, so it can't be served from the deployment directly.
  "/.well-known/webauthn",
];

/**
 * The deployment URL the app is pointed at, or null if this machine doesn't
 * know one.
 *
 * Null is the normal answer in CI: `.env.local` is written by `convex dev` and
 * is not in the repository, so a checkout has nothing to compare the committed
 * file against. That makes "does this match the deployment?" a question only a
 * developer's machine can answer — which is fine, because a developer's
 * machine is also the only place the answer can change.
 */
export const deploymentUrl = async (): Promise<string | null> => {
  const fromEnv = process.env.VITE_CONVEX_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // `convex dev` writes this file; it's the same place the Vite client reads
  // from, so the two can't disagree.
  const local = await readFile(join(root, ".env.local"), "utf8").catch(() => "");
  const match = /^VITE_CONVEX_SITE_URL=(.+)$/m.exec(local);
  return match?.[1] ? match[1].trim().replace(/\/$/, "") : null;
};

/** The same, but for writing — there's nothing to generate without one. */
const requireDeploymentUrl = async (): Promise<string> => {
  const url = await deploymentUrl();
  if (!url) {
    throw new Error(
      "VITE_CONVEX_SITE_URL is not set and .env.local doesn't have it. " +
        "Run `bunx convex dev` once, or set it in the environment.",
    );
  }
  return url;
};

export const buildConfig = (site: string) => ({
  outputDirectory: "dist/client",
  rewrites: PROXIED_PATHS.map((path) => ({ source: path, destination: `${site}${path}` })),
});

const serialize = (config: ReturnType<typeof buildConfig>) =>
  `${JSON.stringify(config, null, 2)}\n`;

/**
 * What's wrong with the committed file on its own terms, without needing to
 * know which deployment is the right one.
 *
 * This is the half that can run anywhere, and it catches the realistic
 * failure: a hand-edit that updated three rewrites and missed the fourth, or
 * a path quietly dropped. Both leave a file that is internally inconsistent,
 * which is visible without any outside knowledge.
 */
export const inconsistencies = async (): Promise<string[]> => {
  const raw = await readFile(CONFIG, "utf8").catch(() => null);
  if (raw === null) return ["vercel.json is missing"];

  let config: ReturnType<typeof buildConfig>;
  try {
    config = JSON.parse(raw) as ReturnType<typeof buildConfig>;
  } catch {
    return ["vercel.json is not valid JSON"];
  }

  const problems: string[] = [];
  const rewrites = config.rewrites ?? [];
  const sources = rewrites.map((r) => r.source);

  for (const path of PROXIED_PATHS) {
    if (!sources.includes(path)) problems.push(`${path} is not proxied`);
  }
  for (const source of sources) {
    if (!PROXIED_PATHS.includes(source)) problems.push(`${source} is proxied but not expected`);
  }

  const hosts = new Set(
    rewrites.map((r) => {
      try {
        return new URL(r.destination).origin;
      } catch {
        problems.push(`${r.source} has an unparseable destination`);
        return "";
      }
    }),
  );
  if (hosts.size > 1) {
    // The half-updated-by-hand case, which is the one that actually happens.
    problems.push(`rewrites point at more than one deployment: ${[...hosts].join(", ")}`);
  }

  for (const rewrite of rewrites) {
    if (!rewrite.destination.endsWith(rewrite.source)) {
      problems.push(`${rewrite.source} is proxied to a different path`);
    }
  }
  return problems;
};

/**
 * Whether the committed file matches the deployment this machine is pointed
 * at. `null` when it does, or when there's no deployment to compare against.
 */
export const drift = async (): Promise<string | null> => {
  const site = await deploymentUrl();
  if (!site) return null;
  const actual = await readFile(CONFIG, "utf8").catch(() => null);
  if (actual === null) return "vercel.json is missing";
  return actual === serialize(buildConfig(site)) ? null : `vercel.json does not match ${site}`;
};

if (import.meta.main) {
  if (process.argv.includes("--check")) {
    const problems = [...(await inconsistencies())];
    const stale = await drift();
    if (stale) problems.push(stale);

    if (problems.length) {
      console.error(
        `vercel.json needs regenerating:\n  ${problems.join("\n  ")}\n\n` +
          "Run `bun run vercel:config` and commit the result.",
      );
      process.exit(1);
    }
    console.log(
      (await deploymentUrl())
        ? "vercel.json is up to date."
        : "vercel.json is self-consistent (no local deployment to compare it against).",
    );
  } else {
    const site = await requireDeploymentUrl();
    await writeFile(CONFIG, serialize(buildConfig(site)));
    console.log(`vercel.json now proxies ${PROXIED_PATHS.length} paths to ${site}.`);
  }
}
