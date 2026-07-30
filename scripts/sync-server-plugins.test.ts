import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COPIED, stale } from "./sync-server-plugins";

const alphabetical = (names: (string | undefined)[]) =>
  [...names].sort((a, b) => (a ?? "").localeCompare(b ?? ""));

/** Every `.ts`/`.tsx` under `dir`, except the generated copies themselves. */
const sources = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const found = await Promise.all(
    entries.map(async (entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        return entry.name === "server-plugins" ? [] : sources(full);
      }
      return /\.tsx?$/.test(entry.name) ? [full] : [];
    }),
  );
  return found.flat();
};

/**
 * The copies under `packages/react/src/server-plugins/` are generated from
 * `convex/lib`, and the published client's types are inferred from them. If
 * they drift, the package's types describe a server that no longer exists —
 * `signIn.solana()` keeps compiling against a signature the deployment stopped
 * offering.
 *
 * The generator is the fix for that; this is the seatbelt for committing
 * without running it.
 */
describe("the package's server-plugin copies", () => {
  it("are in step with convex/lib", async () => {
    expect(await stale()).toEqual([]);
  });

  it("cover every copy the package actually imports", async () => {
    // Guards the other direction: a new server plugin with a client half, left
    // out of COPIED, would never be generated and never be flagged as stale.
    //
    // Scanned across the whole package rather than just `client.ts`, because
    // not every copy is there for a *client plugin* type — `contract` is a
    // constant `useSetupStatus` compares the deployment's answer against, and a
    // check anchored to one file would have said it didn't belong.
    const imported = new Set<string>();
    for (const file of await sources("packages/react/src")) {
      const source = await readFile(file, "utf8");
      for (const match of source.matchAll(/["']\.{1,2}\/server-plugins\/(\w+)["']/g)) {
        imported.add(match[1]);
      }
    }
    expect(imported.size).toBeGreaterThan(0);
    expect(alphabetical([...imported])).toEqual(alphabetical(COPIED));
  });
});
