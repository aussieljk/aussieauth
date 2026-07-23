import { defineSchema } from "convex/server";
import { tables } from "./schema.generated";

/**
 * The generated Better Auth schema, plus the indexes it doesn't know to add.
 *
 * `schema.generated.ts` is rewritten wholesale by `bun run auth:schema`, so
 * anything hand-written there is lost on the next plugin change. This file is
 * the documented place to keep it — see
 * https://labs.convex.dev/better-auth/features/local-install#adding-custom-indexes
 *
 * The generator only emits indexes for the tables it has field metadata for
 * (account, session, user, verification, rateLimit, oauthConsent). `apikey`
 * isn't one of them, so every `api-key/list` was scanning the table and Convex
 * was warning about it on each call. The plugin looks keys up by their owner.
 */
export const tablesWithIndexes = {
  ...tables,
  apikey: tables.apikey.index("referenceId", ["referenceId"]),
};

const schema = defineSchema(tablesWithIndexes);

export default schema;
