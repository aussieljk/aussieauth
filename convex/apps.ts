import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { matchApp } from "./lib/apps";

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

    // An app that was revoked and is registering again keeps the method list
    // it had, unless this call names one. Re-registering is the documented way
    // back from a revoke, and making it start from "all methods" would turn an
    // undo into a silent widening of what the app may do.
    const restored = methods ?? (existing?.revokedAt ? existing.methods : undefined);

    const appId = existing
      ? (await ctx.db.patch(existing._id, {
          name,
          methods: restored,
          updatedAt: Date.now(),
          // Cleared rather than left behind: this row is live again.
          revokedAt: undefined,
        }),
        existing._id)
      : await ctx.db.insert("apps", {
          slug,
          name,
          methods: restored,
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

    return {
      slug,
      origins: origins.length,
      methods: restored ?? null,
      /** True when this call brought a previously revoked app back. */
      restored: Boolean(existing?.revokedAt),
    };
  },
});

/**
 * What revoking `slug` would take away, without taking it.
 *
 * Registering is idempotent and safe to repeat; revoking is neither, and the
 * two sit behind the same secret with the same shape of request. So the read
 * exists separately and `/apps/unregister` answers with it unless the caller
 * explicitly asks for the destructive form.
 */
export const revocationPreview = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const app = await ctx.db
      .query("apps")
      .withIndex("slug", (q) => q.eq("slug", slug))
      .unique();
    if (!app || app.revokedAt) return null;

    const origins = await ctx.db
      .query("appOrigins")
      .withIndex("appId", (q) => q.eq("appId", app._id))
      .collect();

    return {
      slug: app.slug,
      name: app.name,
      methods: app.methods ?? null,
      origins: origins.map((o) => o.origin),
    };
  },
});

/**
 * Revoke an app: drop its origins and mark the row revoked.
 *
 * The counterpart to `register`, and the only way to take access back — an app
 * that could only ever be added would make the allow-list append-only.
 * Existing sessions keep working; this stops new ones being created.
 *
 * The row survives with a `revokedAt` rather than being deleted. Access is
 * gone either way — trust is carried entirely by `appOrigins`, and those rows
 * are — but keeping the row means re-registering restores the method list
 * instead of starting from a blank one. The only thing a revoke should cost
 * you is access, not the configuration you'd have to reconstruct from memory
 * to get it back.
 */
export const unregister = internalMutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const app = await ctx.db
      .query("apps")
      .withIndex("slug", (q) => q.eq("slug", slug))
      .unique();
    if (!app) return { slug, removed: false, origins: [] as string[] };

    const origins = await ctx.db
      .query("appOrigins")
      .withIndex("appId", (q) => q.eq("appId", app._id))
      .collect();
    for (const row of origins) await ctx.db.delete(row._id);
    await ctx.db.patch(app._id, { revokedAt: Date.now() });

    return { slug, removed: true, origins: origins.map((o) => o.origin) };
  },
});

/**
 * The app behind a calling origin — its own registration, read back.
 *
 * An app registers a method list and the server enforces it, but until this
 * existed the app had no way to read that list, so the card drew buttons for
 * methods guaranteed to 403 and the developer found out one click at a time.
 * It answers for the *calling* origin only, which is also what makes it safe
 * to serve unauthenticated: it tells an origin about itself and nothing else,
 * and the origin list is already public at `/.well-known/webauthn`.
 */
export const forOrigin = internalQuery({
  args: { origin: v.string() },
  handler: async (ctx, { origin }) => {
    const rows = await ctx.db.query("appOrigins").collect();
    const apps = new Map((await ctx.db.query("apps").collect()).map((a) => [a._id, a]));

    const byOrigin = new Map(
      rows.flatMap((row) => {
        const app = apps.get(row.appId);
        return app
          ? [
              [
                row.origin,
                { slug: app.slug, name: app.name, methods: app.methods ?? null },
              ] as const,
            ]
          : [];
      }),
    );

    // The same matcher the auth layer uses, so this answers with the app that
    // would actually be resolved for the request rather than a second opinion
    // about it — including the scheme-prefix rule native apps depend on.
    return matchApp(byOrigin, origin);
  },
});
