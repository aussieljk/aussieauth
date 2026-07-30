import { type AppRegistration, fetchAppRegistration } from "./appInfo";

/**
 * Turning the three failures that account for nearly every failed first
 * integration into sentences a developer can act on.
 *
 * All three arrive as something you can't do anything with:
 *
 *   TypeError: Failed to fetch                       — origin not registered
 *   403 "My App doesn't offer that sign-in method."  — true; where's the list?
 *   400 "Provider not found"                         — which provider? set what?
 *
 * The Expo entry point has done this since it shipped (`explainAussieAuthExpoError`),
 * and the web client — which is how most people meet AussieAuth — had no
 * equivalent. This is that translation, promoted out of `expo.tsx` so both
 * sides run every error through it, plus the one thing the sync version can't
 * do: ask the deployment what it thinks of you.
 *
 * Every message ends in a command, not a diagnosis.
 */

/**
 * Which environment variables switch a method on. Also read by the card's
 * "needs setup" hint, so the two can't name different variables.
 */
export const PROVIDER_ENV_VARS: Record<string, string> = {
  google: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET",
  github: "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET",
  apple: "APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID and APPLE_PRIVATE_KEY",
  "magic-link": "RESEND_API_KEY and EMAIL_FROM",
  "email-otp": "RESEND_API_KEY and EMAIL_FROM",
  "ios-otp": "MOBILE_MESSAGE_API_USERNAME, MOBILE_MESSAGE_API_PASSWORD and MOBILE_MESSAGE_SENDER",
};

export type AussieAuthErrorContext = {
  /** The deployment's `.convex.site` origin, when the caller knows it. */
  baseURL?: string;
  /** The method being attempted, so the message can name it. */
  method?: string;
  /**
   * This origin's registration, when it has been read.
   *
   * Three states, and they mean different things: `undefined` is "not asked or
   * couldn't ask" (the deployment is unreachable), a value with
   * `registered: false` is "the deployment is up and doesn't know you", and a
   * registered value carries the method list the 403 was about.
   */
  app?: AppRegistration;
  /** Expo's deep-link scheme, for the native message. */
  scheme?: string;
};

const messageOf = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" ? message : String(error);
};

/**
 * A request the browser refused to send, or one that never arrived.
 *
 * Every engine words it differently and none of them mention CORS — the whole
 * problem being that the browser blocks it before there's a response to read.
 * "Load failed" is Safari's, "Network request failed" is React Native's.
 */
const looksBlocked = (message: string) => {
  const lower = message.toLowerCase();
  return (
    lower.includes("failed to fetch") ||
    lower.includes("network request failed") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("fetch failed") ||
    lower.includes("cors")
  );
};

const currentOrigin = () =>
  typeof window !== "undefined" && window.location ? window.location.origin : null;

/**
 * `aussieauth apps register …`, filled in as far as we can fill it.
 *
 * A native app registers a deep-link *scheme* rather than a web origin — its
 * origin under Expo Go carries a LAN address that changes with the network, so
 * `--origin exp://192.168.1.5:8081` would be right until you moved rooms.
 * `--dev-exp` is what covers Expo Go.
 */
const registerCommand = (
  { origin, scheme }: { origin?: string | null; scheme?: string },
  extra = "",
) =>
  scheme
    ? `aussieauth apps register --slug <your-app> --scheme ${scheme.replace(/:\/?\/?$/, "")} --dev-exp${extra}`
    : `aussieauth apps register --slug <your-app> --origin ${origin ?? "<your-origin>"}${extra}`;

/**
 * The deployment URL mistake, named.
 *
 * `.convex.cloud` and `.convex.site` are both real URLs for the same
 * deployment and only one of them serves auth, so pointing at the wrong one
 * produces a network error identical to the deployment being down. It's the
 * single most common way to get here, and it's invisible unless something says
 * the two names out loud.
 */
const wrongHostHint = (baseURL: string | undefined) =>
  baseURL?.includes(".convex.cloud")
    ? ` That URL ends in .convex.cloud — auth is served from the .convex.site URL for the same deployment (${baseURL.replace(".convex.cloud", ".convex.site")}).`
    : "";

/**
 * The best sentence available for `error` without asking the network anything.
 *
 * Use {@link diagnoseAussieAuthError} where you can await — it fills in the
 * `app` half of the context, which is what turns "one of these two things went
 * wrong" into naming the one that did.
 */
export function explainAussieAuthError(
  error: unknown,
  context: AussieAuthErrorContext = {},
): string {
  const message = messageOf(error);
  const lower = message.toLowerCase();
  const { baseURL, method, app } = context;

  if (lower.includes("scheme not found")) {
    return "No Expo scheme found. Set `expo.scheme` in app.json, or pass `scheme` to createAussieAuthExpoClient.";
  }

  if (looksBlocked(message)) {
    const where = { origin: app?.origin ?? currentOrigin(), scheme: context.scheme };

    // The deployment answered and doesn't trust this origin. That's the whole
    // diagnosis, and it has a one-line fix. Keyed on `trusted` rather than
    // `registered` because an origin can be allowed through `TRUSTED_ORIGINS`
    // with no app row at all.
    if (app?.trusted === false) {
      return `This origin (${where.origin ?? context.scheme ?? "unknown"}) isn't registered with AussieAuth, so the request was blocked before it was sent. Register it: ${registerCommand(where)}`;
    }

    // It answered, it does trust us, and the call still didn't go out. Rare —
    // usually an offline tab or a request blocked by an extension.
    if (app?.trusted) {
      return `${baseURL || "The deployment"} trusts this origin, but the request never reached it. Check your network, then retry.`;
    }

    // Nothing answered at all. Both causes are live, so name both — with the
    // URL mistake first, because it's the one that produces this every time.
    return `Couldn't reach the AussieAuth deployment${baseURL ? ` at ${baseURL}` : ""}.${wrongHostHint(baseURL)} If the URL is right, this origin isn't registered yet: ${registerCommand(where)}`;
  }

  // The per-app method allow-list. The server's own message is accurate and
  // stops one sentence short of useful — it never says where the list lives.
  if (lower.includes("doesn't offer that sign-in method") || lower.includes("forbidden")) {
    const name = app?.name ?? app?.slug ?? "This app";
    const registered = app?.methods?.length ? app.methods.join(", ") : null;
    const wanted = method ?? "that method";
    const full = app?.methods ? [...new Set([...app.methods, method].filter(Boolean))] : null;
    return [
      registered
        ? `${name} is registered for ${registered} — not ${wanted}.`
        : `${name} isn't registered for ${wanted}.`,
      `The list comes from your app's registration, not from the card. Add it: ${registerCommand(
        { origin: app?.origin ?? currentOrigin(), scheme: context.scheme },
        full ? ` --methods ${full.join(",")}` : ` --methods ${wanted}`,
      )}`,
    ].join(" ");
  }

  // Better Auth's wording when a social provider was never registered, which
  // here means its credentials aren't set on the deployment.
  if (lower.includes("provider not found") || lower.includes("provider not configured")) {
    const vars = (method && PROVIDER_ENV_VARS[method]) ?? "the provider's credentials";
    const named = method ? `${method} isn't` : "That provider isn't";
    return `${named} configured on this deployment. Set ${vars}: bunx convex env set ${vars.split(/[, ]/)[0]} <value>`;
  }

  if (lower.includes("convex") && lower.includes("auth")) {
    return "Convex isn't receiving an AussieAuth token. Wrap the app in <AussieAuthProvider> (from @aussieljk/auth/convex, or /expo on native), or pass the AussieAuth client to ConvexBetterAuthProvider yourself.";
  }

  return message;
}

/**
 * {@link explainAussieAuthError}, having first asked the deployment who we are
 * to it.
 *
 * One extra request, only on the failures where the answer changes the
 * sentence, and the answer is cached per deployment so a run of failed clicks
 * costs one. `/apps/me` is readable from any origin by design — a blocked
 * request has no response body, so the only way to tell "not registered" from
 * "not there" is to ask something that can't itself be blocked.
 */
export async function diagnoseAussieAuthError(
  error: unknown,
  context: AussieAuthErrorContext = {},
): Promise<string> {
  const message = messageOf(error);
  const lower = message.toLowerCase();
  const worthAsking =
    looksBlocked(message) ||
    lower.includes("doesn't offer that sign-in method") ||
    lower.includes("forbidden");

  if (!worthAsking || !context.baseURL || context.app) {
    return explainAussieAuthError(error, context);
  }

  const app = await fetchAppRegistration(context.baseURL).catch(() => undefined);
  return explainAussieAuthError(error, { ...context, app });
}
