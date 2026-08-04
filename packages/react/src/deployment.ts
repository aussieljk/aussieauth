/**
 * Working out where the deployment is and what kind of app is asking.
 *
 * Pure, and separate from `cli.ts` on purpose: that file runs `main()` at
 * module scope, so importing it from a test would execute the CLI. It's also
 * the one place `.convex.cloud → .convex.site` is written down — the web
 * provider and the CLI both need it, and two implementations of that
 * substitution would be two chances to get the most expensive typo in the
 * setup wrong.
 */

/**
 * `.convex.cloud` → `.convex.site`.
 *
 * Both are real URLs for the same deployment and only one of them serves auth.
 * Using the wrong one produces `TypeError: Failed to fetch` — no status, no
 * body, nothing naming either host. Deriving it means nobody types it.
 */
export const siteUrlFromConvexUrl = (url: string) => {
  try {
    // Rewritten on the parsed hostname rather than by pattern on the string:
    // a plain replace also hits `.convex.cloud` appearing in a path, which is
    // rare but silently corrupts a URL rather than failing.
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.replace(/\.convex\.cloud$/, ".convex.site");
    return parsed.toString().replace(/\/$/, "");
  } catch {
    // Not a URL — a bare hostname, most likely. Still worth correcting.
    return url.replace(/\.convex\.cloud$/, ".convex.site").replace(/\/$/, "");
  }
};

/** `KEY=value` out of a dotenv file, quotes stripped. */
export const parseEnvFile = (text: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/i.exec(line);
    if (!match) continue;
    out[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
};

/**
 * The auth server's URL, worked out from the project rather than asked for.
 *
 * `convex dev` writes `CONVEX_DEPLOYMENT=dev:giddy-dinosaur-765` and a
 * `CONVEX_URL` into `.env.local`. Either is enough to name the `.convex.site`
 * host, and between them they cover every project layout — which is the point:
 * the URL nobody can guess is never typed.
 */
export const deploymentUrl = (env: Record<string, string | undefined>): string => {
  const explicit =
    env.AUSSIEAUTH_URL ||
    env.VITE_AUSSIEAUTH_URL ||
    env.NEXT_PUBLIC_AUSSIEAUTH_URL ||
    env.EXPO_PUBLIC_AUSSIEAUTH_URL;
  if (explicit) return siteUrlFromConvexUrl(explicit);

  const convexUrl =
    env.CONVEX_URL ||
    env.VITE_CONVEX_URL ||
    env.NEXT_PUBLIC_CONVEX_URL ||
    env.EXPO_PUBLIC_CONVEX_URL;
  if (convexUrl) return siteUrlFromConvexUrl(convexUrl);

  // `dev:name-123` / `prod:name-123`, which is what the Convex CLI writes.
  const name = env.CONVEX_DEPLOYMENT?.split(":").pop();
  return name ? `https://${name}.convex.site` : "";
};

/**
 * The two ways to use AussieAuth, and the only thing that separates them:
 * whose deployment mints the session.
 *
 * **hosted** — aussieauth.com mints it. The app's own Convex deployment holds
 * the app's data and verifies the token; it runs no auth code, has no auth
 * tables and needs no provider credentials. This is the default, and the whole
 * setup is three commands.
 *
 * **self-hosted** — the app's own Convex deployment *is* an AussieAuth
 * deployment, because you forked the repo into it. It mints its own tokens, so
 * the issuer and the app are the same origin and every provider credential is
 * yours to set.
 *
 * Both produce the same `ctx.auth.getUserIdentity()` in the app's functions,
 * and the same card on the frontend. Nothing but the issuer changes, which is
 * what makes moving from one to the other a one-line edit.
 */
export type Mode = "hosted" | "self-hosted";

/**
 * aussieauth.com's deployment.
 *
 * The `.convex.site` host rather than `aussieauth.com`, because that's the
 * origin that signs the tokens and serves the JWKS — `aussieauth.com` is a
 * static site in front of it that proxies four paths, and a JWT issuer has to
 * be the thing that actually issued.
 */
export const HOSTED_AUTH_URL = "https://giddy-dinosaur-765.convex.site";

/**
 * Where the app should send its sign-ins.
 *
 * In hosted mode that's a constant — nothing about the app's own project can
 * name someone else's deployment. In self-hosted mode it's the app's own
 * deployment, worked out by `deploymentUrl`. An explicit `--url` wins over
 * either, because the one case neither covers is a second AussieAuth of your
 * own.
 */
export const authUrlForMode = (
  mode: Mode,
  env: Record<string, string | undefined>,
  explicit = "",
): string => {
  if (explicit) return siteUrlFromConvexUrl(explicit);
  return mode === "hosted" ? HOSTED_AUTH_URL : deploymentUrl(env);
};

/**
 * `convex/auth.config.ts` for the app's own deployment — the file that makes
 * `ctx.auth.getUserIdentity()` return someone.
 *
 * Self-hosted resolves the issuer from its own `CONVEX_SITE_URL` at runtime, so
 * the file is the same in every deployment and carries no URL. Hosted has to
 * name the issuer, because the deployment verifying the token is not the one
 * that signed it — and that difference is the entire difference between the
 * two modes, in four lines.
 */
export const authConfigFile = (mode: Mode, authUrl: string) =>
  mode === "self-hosted"
    ? `import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

/**
 * This deployment signs its own tokens, so the issuer is itself — resolved
 * from CONVEX_SITE_URL at runtime rather than written down here.
 */
export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;
`
    : `import type { AuthConfig } from "convex/server";

/**
 * Sessions are minted by AussieAuth and verified here.
 *
 * This deployment runs no auth code and stores no auth tables: it holds a
 * public key fetched from the issuer's JWKS and checks a signature with it.
 * That's what makes \`ctx.auth.getUserIdentity()\` work in every query and
 * mutation without an auth dependency in this project.
 *
 * To self-host later, replace this file with \`getAuthConfigProvider()\` from
 * \`@convex-dev/better-auth/auth-config\` and point the app at your own
 * deployment. Nothing else changes — same tokens, same identity, same card.
 */
export default {
  providers: [
    {
      type: "customJwt",
      issuer: "${authUrl}",
      // Better Auth's Convex plugin stamps every token with this audience.
      applicationID: "convex",
      algorithm: "RS256",
      jwks: "${authUrl}/api/auth/convex/jwks",
    },
  ],
} satisfies AuthConfig;
`;

export type Framework = "expo" | "next" | "tanstack-start" | "vite" | "unknown";

/**
 * Which framework a directory holds.
 *
 * Ordered most specific first, because the signals nest: a TanStack Start app
 * has vite in its dependencies, and an Expo app may have neither. The order is
 * the whole algorithm.
 */
export const detectFramework = (
  deps: Record<string, string | undefined>,
  hasFile: (file: string) => boolean,
): Framework => {
  if (deps.expo || hasFile("app.json")) return "expo";
  if (deps["@tanstack/react-start"]) return "tanstack-start";
  if (deps.next) return "next";
  if (deps.vite || hasFile("vite.config.ts") || hasFile("vite.config.js")) return "vite";
  return "unknown";
};

/** Where each framework's dev server lives, for the origin we register. */
export const DEV_ORIGIN: Record<Framework, string> = {
  vite: "http://localhost:5173",
  "tanstack-start": "http://localhost:3000",
  next: "http://localhost:3000",
  // Native apps register a deep-link scheme instead — their Expo Go origin
  // carries a LAN address that changes with the network.
  expo: "",
  unknown: "http://localhost:5173",
};

/** The env-var prefix each bundler will actually inline into client code. */
export const ENV_PREFIX: Record<Framework, string> = {
  vite: "VITE_",
  "tanstack-start": "VITE_",
  next: "NEXT_PUBLIC_",
  expo: "EXPO_PUBLIC_",
  unknown: "VITE_",
};
