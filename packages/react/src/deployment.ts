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
