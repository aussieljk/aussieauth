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

/** Reads the deployment URL the app is pointed at. */
export const deploymentUrl = async (): Promise<string> => {
  const fromEnv = process.env.VITE_CONVEX_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // `convex dev` writes this file; it's the same place the Vite client reads
  // from, so the two can't disagree.
  const local = await readFile(join(root, ".env.local"), "utf8").catch(() => "");
  const match = /^VITE_CONVEX_SITE_URL=(.+)$/m.exec(local);
  if (!match?.[1]) {
    throw new Error(
      "VITE_CONVEX_SITE_URL is not set and .env.local doesn't have it. " +
        "Run `bunx convex dev` once, or set it in the environment.",
    );
  }
  return match[1].trim().replace(/\/$/, "");
};

export const buildConfig = (site: string) => ({
  outputDirectory: "dist/client",
  rewrites: PROXIED_PATHS.map((path) => ({ source: path, destination: `${site}${path}` })),
});

const serialize = (config: ReturnType<typeof buildConfig>) =>
  `${JSON.stringify(config, null, 2)}\n`;

/** The reason the committed file is out of date, or null if it isn't. */
export const drift = async (): Promise<string | null> => {
  const site = await deploymentUrl();
  const want = serialize(buildConfig(site));
  const actual = await readFile(CONFIG, "utf8").catch(() => null);
  if (actual === null) return "vercel.json is missing";
  if (actual !== want) return `vercel.json does not match ${site}`;
  return null;
};

if (import.meta.main) {
  if (process.argv.includes("--check")) {
    const problem = await drift();
    if (problem) {
      console.error(`${problem}\n\nRun \`bun run vercel:config\` and commit the result.`);
      process.exit(1);
    }
    console.log("vercel.json is up to date.");
  } else {
    const site = await deploymentUrl();
    await writeFile(CONFIG, serialize(buildConfig(site)));
    console.log(`vercel.json now proxies ${PROXIED_PATHS.length} paths to ${site}.`);
  }
}
