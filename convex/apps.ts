import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Reads and writes for the app registry. The auth layer consumes these through
 * `convex/lib/apps.ts`; nothing here is public, because the only way in from
 * outside is `/apps/register`, which checks the shared secret first.
 */

/**
 * Everything the auth layer needs about every app, in one read.
 *
 * Deliberately one query rather than three: a single auth request wants the
 * trusted-origin list, the app behind the calling origin, and that app's
 * method list. Fetching them separately would triple the round trips on the
 * hot path for a table that is a handful of rows.
 */
export const snapshot = internalQuery({
  args: {},
  handler: async (ctx) => {
    const apps = await ctx.db.query("apps").collect();
    const origins = await ctx.db.query("appOrigins").collect();
    const byId = new Map(apps.map((a) => [a._id, a]));

    return {
      origins: origins.map((o) => o.origin),
      /** origin → the app that claimed it. */
      byOrigin: origins.flatMap((o) => {
        const app = byId.get(o.appId);
        return app
          ? [
              [
                o.origin,
                {
                  slug: app.slug,
                  name: app.name,
                  methods: app.methods ?? null,
                },
              ] as const,
            ]
          : [];
      }),
    };
  },
});

/**
 * Upsert an app and replace its origin list.
 *
 * Idempotent: an app re-registering with the same config is a no-op write, so
 * it's safe to call from a client that can't easily tell whether it already
 * has.
 */
export const register = internalMutation({
  args: {
    slug: v.string(),
    name: v.string(),
    origins: v.array(v.string()),
    methods: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { slug, name, origins, methods }) => {
    const existing = await ctx.db
      .query("apps")
      .withIndex("slug", (q) => q.eq("slug", slug))
      .unique();

    // Check every origin before writing anything. One app quietly taking over
    // another's origin would hand it that app's sign-ins, so a conflict has to
    // fail the whole call rather than partially apply.
    for (const origin of origins) {
      const claimed = await ctx.db
        .query("appOrigins")
        .withIndex("origin", (q) => q.eq("origin", origin))
        .first();
      if (claimed && claimed.appId !== existing?._id) {
        const owner = await ctx.db.get(claimed.appId);
        // ConvexError rather than Error: a plain throw reaches the caller as a
        // stack trace, and this is a message the other app's developer is
        // meant to read and act on.
        throw new ConvexError(
          `Origin ${origin} already belongs to "${owner?.slug ?? "another app"}"`,
        );
      }
    }

    const appId = existing
      ? (await ctx.db.patch(existing._id, {
          name,
          methods,
          updatedAt: Date.now(),
        }),
        existing._id)
      : await ctx.db.insert("apps", {
          slug,
          name,
          methods,
          updatedAt: Date.now(),
        });

    // Replace rather than merge, so removing an origin from the app's config
    // actually removes its access.
    const previous = await ctx.db
      .query("appOrigins")
      .withIndex("appId", (q) => q.eq("appId", appId))
      .collect();
    for (const row of previous) await ctx.db.delete(row._id);
    for (const origin of origins) {
      await ctx.db.insert("appOrigins", { origin, appId });
    }

    return { slug, origins: origins.length };
  },
});

/**
 * Revoke an app: drop its origins and its row.
 *
 * The counterpart to `register`, and the only way to take access back — an app
 * that could only ever be added would make the allow-list append-only.
 * Existing sessions keep working; this stops new ones being created.
 */
export const unregister = internalMutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const app = await ctx.db
      .query("apps")
      .withIndex("slug", (q) => q.eq("slug", slug))
      .unique();
    if (!app) return { slug, removed: false };

    const origins = await ctx.db
      .query("appOrigins")
      .withIndex("appId", (q) => q.eq("appId", app._id))
      .collect();
    for (const row of origins) await ctx.db.delete(row._id);
    await ctx.db.delete(app._id);

    return { slug, removed: true };
  },
});
