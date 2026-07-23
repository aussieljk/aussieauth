/**
 * The two URLs every wizard has to hand someone, resolved at build time.
 *
 * Both are baked into the bundle rather than read from `window`, because these
 * pages prerender — reading the current origin would mean the HTML said one
 * thing and hydration said another. They're also the right answers regardless
 * of where the page is being viewed: a provider console wants the deployment
 * and the deployed site, never whatever localhost you happen to be on.
 */

export const CONVEX_SITE =
  import.meta.env.VITE_CONVEX_SITE_URL || "https://<deployment>.convex.site";

/** Where the site itself is served. Apple's return URL has to be on it. */
export const SITE_URL = "https://aussieauth.com";

export const callbackFor = (provider: string) => `${CONVEX_SITE}/api/auth/callback/${provider}`;
