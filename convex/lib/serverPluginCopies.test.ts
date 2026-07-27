import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `packages/react/src/server-plugins/` keeps byte-for-byte copies of the
 * plugins in this directory — `import type`-only, so the package can infer
 * client method signatures without depending on the Convex tree. The copies
 * are the package's contract; these files are the runtime. If they drift, the
 * published client types lie about what the server does.
 *
 * On failure: edit the file under `convex/lib/`, then copy it over its twin.
 */
const COPIED = ["accountNumber", "demo", "linking", "solana", "status"];

describe("the package's server-plugin copies match convex/lib", () => {
  for (const name of COPIED) {
    it(`${name}.ts`, () => {
      const lib = readFileSync(join(process.cwd(), "convex/lib", `${name}.ts`), "utf8");
      const copy = readFileSync(
        join(process.cwd(), "packages/react/src/server-plugins", `${name}.ts`),
        "utf8",
      );
      expect(copy).toBe(lib);
    });
  }
});
