import { env, query } from "./_generated/server";
import { authComponent } from "./auth";
import { capToRelatedOriginLimit, RELATED_ORIGIN_LABEL_LIMIT } from "./lib/apps";

/**
 * The registry as `/admin` shows it: every registered app with its origins and
 * method list, plus how the WebAuthn five-site budget is spent.
 *
 * Answered only for the signed-in user whose email is `ADMIN_EMAIL`. Everyone
 * else — including signed-out — gets `null`, indistinguishable from the page
 * not existing. The data isn't secret (origins are published at
 * `/.well-known/webauthn`) but method lists and update times are nobody
 * else's business.
 */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const admin = env.ADMIN_EMAIL;
    if (!admin) return null;
    const user = await authComponent.safeGetAuthUser(ctx);
    if (user?.email !== admin) return null;

    const apps = await ctx.db.query("apps").collect();
    const origins = await ctx.db.query("appOrigins").collect();

    // The same computation `relatedOrigins` makes per request, minus the ctx
    // plumbing: static origins first, then everything apps registered.
    const site = env.SITE_URL ?? "http://localhost:5173";
    const envOrigins = (env.TRUSTED_ORIGINS ?? "")
      .split(",")
      .map((o: string) => o.trim())
      .filter(Boolean);
    const web = [site, ...envOrigins, ...origins.map((o) => o.origin)]
      .filter((o) => /^https?:\/\//.test(o))
      .filter((o, i, xs) => xs.indexOf(o) === i);
    const { kept, dropped } = capToRelatedOriginLimit(web);

    return {
      apps: apps.map((app) => ({
        slug: app.slug,
        name: app.name,
        methods: app.methods ?? null,
        origins: origins.filter((o) => o.appId === app._id).map((o) => o.origin),
        updatedAt: app.updatedAt,
      })),
      passkeyOrigins: { limit: RELATED_ORIGIN_LABEL_LIMIT, active: kept, dropped },
    };
  },
});
