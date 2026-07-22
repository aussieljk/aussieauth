/**
 * Regenerates convex/betterAuth/schema.ts from the plugin list in convex/auth.ts.
 *
 * Stands in for the documented `npx auth generate`, whose published CLI still
 * targets better-auth 1.4. Run it after changing plugins:  bun run auth:schema
 */
import { writeFileSync } from "node:fs";
import { getAuthTables } from "better-auth/db";
import { createSchema } from "../node_modules/@convex-dev/better-auth/dist/client/create-schema.js";
import { createAuthOptions } from "../convex/auth";

process.chdir(new URL("../convex/betterAuth", import.meta.url).pathname);

const options = createAuthOptions({} as never);
const { code, path } = await createSchema({ tables: getAuthTables(options) });

writeFileSync(path, code);
console.log(`wrote convex/betterAuth/${path.replace("./", "")}`);
