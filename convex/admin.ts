import { env, query } from "./_generated/server";
import { authComponent } from "./auth";
import { RELATED_ORIGIN_LABEL_LIMIT } from "./lib/apps";
import { DEFAULT_SITE_URL, parseOrigins, passkeyOrigins } from "./lib/site";

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

    // Literally the function `/.well-known/webauthn` publishes from, so this
    // page reports the budget the browser will actually see rather than a
    // second opinion about it.
    const { kept, dropped } = passkeyOrigins({
      siteUrl: env.SITE_URL ?? DEFAULT_SITE_URL,
      envOrigins: parseOrigins(env.TRUSTED_ORIGINS),
      appOrigins: origins.map((o) => o.origin),
    });

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
