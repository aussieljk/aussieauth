import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import type { GenericCtx } from "@convex-dev/better-auth";
import { internal } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import { isEnforceablePath, methodForRequest } from "./methods";
import { isSchemeOrigin } from "./registration";

/**
 * The app registry, as the auth layer sees it.
 *
 * Every auth request needs some of this — the trusted-origin list at minimum —
 * so it's fetched as one snapshot and held briefly rather than queried three
 * times per request.
 */

export type App = {
  slug: string;
  name: string;
  /** null means every method is allowed. */
  methods: string[] | null;
};

type Snapshot = { origins: string[]; byOrigin: Map<string, App> };

/**
 * Five seconds, which is the trade this cache is making: an app that has just
 * registered itself is trusted almost immediately, and the steady state costs
 * one query per five seconds per isolate rather than one per request.
 *
 * Registering invalidates this isolate's copy outright, so the window only
 * applies to *other* isolates that happen to be warm at that moment.
 */
const TTL_MS = 5_000;

/**
 * Two caches, because there are two ways in and they don't carry the same
 * information. `snapshot` is the full registry and only the database path can
 * produce it; `origins` is just the allow-list and CORS can only get that far.
 * Keeping them apart stops a CORS-shaped read from standing in for a registry
 * read and quietly emptying `byOrigin` — which would switch off method
 * enforcement and session stamping for the life of the cache entry.
 */
let snapshotCache: { at: number; snapshot: Snapshot } | null = null;
let originsCache: { at: number; origins: string[] } | null = null;

/** Called after a successful registration so the next read sees it. */
export const invalidateApps = () => {
  snapshotCache = null;
  originsCache = null;
};

const load = async (ctx: GenericCtx<DataModel>): Promise<Snapshot> => {
  const now = Date.now();
  if (snapshotCache && now - snapshotCache.at < TTL_MS) {
    return snapshotCache.snapshot;
  }

  const raw = await ctx.runQuery(internal.apps.snapshot, {});
  const snapshot: Snapshot = {
    origins: raw.origins,
    byOrigin: new Map(raw.byOrigin),
  };
  snapshotCache = { at: now, snapshot };
  originsCache = { at: now, origins: snapshot.origins };
  return snapshot;
};

/** Whether this ctx can actually reach the database. */
const canQuery = (ctx: unknown): ctx is GenericCtx<DataModel> =>
  typeof (ctx as { runQuery?: unknown } | null)?.runQuery === "function";

/**
 * The same origin list, fetched over HTTP instead of from the database.
 *
 * Needed because CORS preflight can't reach the database. `registerRoutes`
 * builds its allow-list from an auth instance created with an empty ctx
 * (`createAuth({})`), and `corsRouter`'s `allowedOrigins` is handed only the
 * Request — neither layer has anywhere to put a ctx. So the OPTIONS response
 * omitted `Access-Control-Allow-Origin` for every registered app and browsers
 * blocked the request before it was ever sent.
 *
 * These origins are already public: `/.well-known/webauthn` has to publish
 * them for cross-domain passkeys to work at all.
 */
const originsOverHttp = async () => {
  // Convex sets this one itself, so it isn't declared in convex.config.ts and
  // doesn't come through `env`.
  const base = process.env.CONVEX_SITE_URL;
  if (!base) return [];
  const res = await fetch(`${base}/apps/origins`);
  if (!res.ok) throw new Error(`origins endpoint returned ${res.status}`);
  const body = (await res.json()) as { origins?: unknown };
  return Array.isArray(body.origins)
    ? body.origins.filter((o): o is string => typeof o === "string")
    : [];
};

/**
 * Origins claimed by registered apps. Added to the static trusted list rather
 * than replacing it, so this deployment's own site keeps working with an empty
 * table — including on a fresh checkout, before anything has registered.
 */
export const registeredOrigins = async (ctx: unknown) => {
  const now = Date.now();
  if (originsCache && now - originsCache.at < TTL_MS)
    return originsCache.origins;

  try {
    const origins = canQuery(ctx)
      ? (await load(ctx)).origins
      : await originsOverHttp();
    originsCache = { at: now, origins };
    return origins;
  } catch (e) {
    // Must not take the auth server down — the static list still covers this
    // site. Logged rather than swallowed: silently returning [] is exactly
    // what made the CORS gap invisible.
    console.error("Could not load registered origins", e);
    return [];
  }
};

/**
 * The app that claimed `origin`, out of the registry.
 *
 * A browser origin matches exactly. A native app's doesn't: the Expo plugin
 * derives it from the app's deep-link scheme, and inside Expo Go that carries a
 * LAN address which changes with the network — `exp://192.168.1.5:8081/--/`
 * today, something else on another wifi. So a registered *scheme* origin
 * (`exp://`, `aussieauthios://`) matches by prefix instead.
 *
 * This is the same rule Better Auth applies to its own trusted-origin list for
 * non-http protocols (`url.startsWith(pattern)` in `matchesOriginPattern`), so
 * an origin trusted for the request resolves to the app the same way. Exact
 * match is tried first: it's the common case, and a `Map` hit beats a scan.
 *
 * Prefix matching is confined to scheme origins on purpose. Doing it for web
 * origins too would mean `https://myapp.com` claimed `https://myapp.com.evil`,
 * which is the classic prefix-match hole — and registration already refuses to
 * store a bare `https://` that would match everything.
 */
export const matchApp = (
  byOrigin: Map<string, App>,
  origin: string,
): App | null => {
  const exact = byOrigin.get(origin);
  if (exact) return exact;

  for (const [claimed, app] of byOrigin) {
    if (isSchemeOrigin(claimed) && origin.startsWith(claimed)) return app;
  }
  return null;
};

/** The app that claimed `origin`, if any. */
export const resolveApp = async (
  ctx: GenericCtx<DataModel>,
  origin: string | null | undefined,
): Promise<App | null> => {
  if (!origin) return null;
  try {
    return matchApp((await load(ctx)).byOrigin, origin);
  } catch {
    return null;
  }
};

/** Good enough for counting distinct sites: last two dot-separated parts. */
const etldPlusOne = (origin: string) => {
  try {
    return new URL(origin).hostname.split(".").slice(-2).join(".");
  } catch {
    return origin;
  }
};

/** WebAuthn ignores related origins past the fifth distinct eTLD+1. */
export const RELATED_ORIGIN_LABEL_LIMIT = 5;

/**
 * Trim a related-origins list to what a browser will actually honour.
 *
 * The limit counts *labels*, not origins, so several origins on one site are
 * free — `myapp.com` and `staging.myapp.com` cost one between them. Returning
 * more than the limit wouldn't error; the browser would just ignore the tail,
 * so whichever apps landed at the back would fail passkeys for no visible
 * reason. Better to drop them knowingly and say so.
 */
export const capToRelatedOriginLimit = (origins: string[]) => {
  const labels: string[] = [];
  const kept: string[] = [];
  const dropped: string[] = [];

  for (const origin of origins) {
    const label = etldPlusOne(origin);
    if (labels.includes(label)) {
      kept.push(origin);
    } else if (labels.length < RELATED_ORIGIN_LABEL_LIMIT) {
      labels.push(label);
      kept.push(origin);
    } else {
      dropped.push(origin);
    }
  }
  return { kept, dropped };
};

/**
 * Holds an app to the methods it registered.
 *
 * Without this the method list would be presentation only — `<SignIn methods>`
 * already hides the buttons, and anyone can hand-craft the request anyway. The
 * check deliberately fails *open* for an origin no app has claimed: those are
 * already gated by `trustedOrigins`, and this deployment's own sign-in page is
 * one of them.
 */
export const appMethods = (ctx: GenericCtx<DataModel>) =>
  ({
    id: "app-methods",
    hooks: {
      before: [
        {
          matcher: (c) => isEnforceablePath(c.path),
          handler: createAuthMiddleware(async (c) => {
            const app = await resolveApp(ctx, c.headers?.get("origin"));
            if (!app?.methods) return;

            const method = methodForRequest(c.path, c.body, c.params);
            // An unrecognised path is not evidence of wrongdoing — it's a
            // method we haven't mapped. Blocking here would break sign-in
            // every time Better Auth adds an endpoint.
            if (!method || app.methods.includes(method)) return;

            throw new APIError("FORBIDDEN", {
              message: `${app.name} doesn't offer that sign-in method.`,
            });
          }),
        },
      ],
    },
  }) satisfies BetterAuthPlugin;
