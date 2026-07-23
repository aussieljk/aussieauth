/**
 * Regenerates convex/betterAuth/schema.generated.ts from the plugin list in
 * convex/auth.ts.
 *
 * Stands in for the documented `npx auth generate`, whose published CLI still
 * targets better-auth 1.4. Run it after changing plugins:  bun run auth:schema
 *
 * Writes to schema.generated.ts, never schema.ts — the latter is hand-written
 * and adds the indexes the generator doesn't know about (see it for which).
 */
import { writeFileSync } from "node:fs";
import { getAuthTables } from "better-auth/db";
import { createSchema } from "../node_modules/@convex-dev/better-auth/dist/client/create-schema.js";
import { createAuthOptions } from "../convex/auth";

process.chdir(new URL("../convex/betterAuth", import.meta.url).pathname);

const options = createAuthOptions({} as never);
const { code, path } = await createSchema({
  tables: getAuthTables(options),
  file: "./schema.generated.ts",
});

writeFileSync(path, code);
console.log(`wrote convex/betterAuth/${path.replace("./", "")}`);
