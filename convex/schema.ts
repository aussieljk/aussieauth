import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Users, sessions, accounts, passkeys and API keys all live inside the Better
// Auth component's own tables — see convex/betterAuth/schema.ts. App tables go
// here alongside them.
export default defineSchema({
  /**
   * The apps allowed to use this auth server.
   *
   * An app registers itself (see `/apps/register` in http.ts) rather than being
   * added here by hand, so standing up a new project means setting one env var
   * in *that* project — nothing in this repo changes.
   */
  apps: defineTable({
    /** Chosen by the app. Stable across deploys and domain moves. */
    slug: v.string(),
    name: v.string(),
    /**
     * Which sign-in methods this app may use. Absent means all of them, which
     * is the safe default — a wrong entry here locks people out.
     */
    methods: v.optional(v.array(v.string())),
    updatedAt: v.number(),
    /**
     * When the app was revoked, if it has been. Set rather than deleting the
     * row, so re-registering restores the method list the app had rather than
     * starting from a blank one — a revoke you didn't mean is otherwise only
     * undoable by remembering exactly what was in it.
     *
     * A revoked app owns no origins (those rows are deleted), so it is trusted
     * by nothing and matches nothing until it registers again.
     */
    revokedAt: v.optional(v.number()),
  }).index("slug", ["slug"]),

  /**
   * One row per origin rather than an array on `apps`, because Convex has no
   * array-contains index and this is read on every auth request.
   */
  appOrigins: defineTable({
    origin: v.string(),
    appId: v.id("apps"),
  })
    .index("origin", ["origin"])
    .index("appId", ["appId"]),
});
