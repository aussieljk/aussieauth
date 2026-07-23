import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import type { GenericCtx } from "@convex-dev/better-auth";
import { internal } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import { isEnforceablePath, methodForRequest } from "./methods";

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

let cache: { at: number; snapshot: Snapshot } | null = null;

/** Called after a successful registration so the next read sees it. */
export const invalidateApps = () => {
  cache = null;
};

const load = async (ctx: GenericCtx<DataModel>): Promise<Snapshot> => {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.snapshot;

  const raw = await ctx.runQuery(internal.apps.snapshot, {});
  const snapshot: Snapshot = {
    origins: raw.origins,
    byOrigin: new Map(raw.byOrigin),
  };
  cache = { at: now, snapshot };
  return snapshot;
};

/**
 * Origins claimed by registered apps. Added to the static trusted list rather
 * than replacing it, so this deployment's own site keeps working with an empty
 * table — including on a fresh checkout, before anything has registered.
 */
export const registeredOrigins = async (ctx: GenericCtx<DataModel>) => {
  try {
    return (await load(ctx)).origins;
  } catch {
    // A failed read must not take the auth server down with it; the static
    // list still covers this site.
    return [];
  }
};

/** The app that claimed `origin`, if any. */
export const resolveApp = async (
  ctx: GenericCtx<DataModel>,
  origin: string | null | undefined,
): Promise<App | null> => {
  if (!origin) return null;
  try {
    return (await load(ctx)).byOrigin.get(origin) ?? null;
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
