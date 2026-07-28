import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { COPIED, stale } from "./sync-server-plugins";

const alphabetical = (names: (string | undefined)[]) =>
  [...names].sort((a, b) => (a ?? "").localeCompare(b ?? ""));

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

  it("cover every plugin the client infers types from", async () => {
    // Guards the other direction: a new server plugin with a client half, left
    // out of COPIED, would never be generated and never be flagged as stale.
    const client = await readFile("packages/react/src/client.ts", "utf8");
    const imported = [...client.matchAll(/from "\.\/server-plugins\/(\w+)"/g)].map((m) => m[1]);
    expect(imported.length).toBeGreaterThan(0);
    expect(alphabetical(imported)).toEqual(alphabetical(COPIED));
  });
});
