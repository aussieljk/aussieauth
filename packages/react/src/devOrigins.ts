/**
 * Which origins this project's dev server will actually be on.
 *
 * The old answer was a per-framework constant, and it was wrong the moment a
 * project set a port or ran behind portless — which rewrites the dev server on
 * to `https://<name>.localhost` and takes the port out of the picture
 * altogether. A guessed origin produces the worst outcome available: a card
 * that renders and then fails on click, with the registered origin and the
 * real one differing by a number nobody thought to compare.
 *
 * So the list is read out of the project, and it is a *list* — registering
 * three origins costs nothing and covers the ways one project gets served.
 */

import type { Framework } from "./deployment";
import { DEV_ORIGIN } from "./deployment";

/** `--port 4000`, `-p 4000`, `--port=4000`, `PORT=4000 vite`. */
const portFrom = (script: string): string => {
  const match =
    /(?:--port|-p)[= ](\d{2,5})/.exec(script) ?? /(?:^|\s)PORT=(\d{2,5})/.exec(script);
  return match?.[1] ?? "";
};

/**
 * The name portless serves a project under.
 *
 * `portless run <cmd>` names it after the directory; `portless <name> <cmd>`
 * names it outright. The second form has a command after the name, which is
 * what tells the two apart — `run` is just the name that is reserved.
 */
export const portlessName = (script: string, fallback: string): string => {
  const parts = script.trim().split(/\s+/);
  const at = parts.indexOf("portless");
  if (at === -1) return "";
  const next = parts[at + 1];
  if (!next || next.startsWith("-")) return fallback;
  return next === "run" ? fallback : next;
};

/** A directory or package name, as a hostname label. */
const label = (name: string) =>
  name
    .replace(/^@[^/]+\//, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Whether an origin is somebody's own machine.
 *
 * A second, smaller opinion than the deployment's `isDevOrigin`, which is the
 * authority and the one that decides whether a secret is needed. This one only
 * ever softens a message — a wrong answer here changes wording, never access —
 * so a copy is cheaper than shipping the server's rule into this package.
 */
export const isLocalOrigin = (value: string) => {
  try {
    const { hostname } = new URL(value);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
};

export type OriginInput = {
  framework: Framework;
  /** The project's `scripts` block. */
  scripts: Record<string, string | undefined>;
  /** Package name, or the directory name when there isn't one. */
  name: string;
  /** `--origin`, repeatable. Wins over everything and is used alone. */
  explicit?: string[];
};

/**
 * Every origin worth registering for this project, most likely first.
 *
 * Deduplicated, and never empty for a web framework: a project with no dev
 * script still gets the framework's default, because "couldn't tell" must not
 * come out as "registered nothing".
 */
export function devOrigins({ framework, scripts, name, explicit = [] }: OriginInput): string[] {
  if (explicit.length) return [...new Set(explicit)];
  if (framework === "expo") return [];

  const script = scripts.dev ?? scripts.start ?? "";
  const found: string[] = [];

  const portless = portlessName(script, label(name));
  if (portless) found.push(`https://${portless}.localhost`);

  const port = portFrom(script);
  if (port) found.push(`http://localhost:${port}`);

  found.push(DEV_ORIGIN[framework] || DEV_ORIGIN.unknown);
  return [...new Set(found.filter(Boolean))];
}
