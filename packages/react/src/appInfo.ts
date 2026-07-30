import { useEffect, useState } from "react";
import { useAuthBaseURL } from "./context";

/**
 * What the deployment says about *this* origin: which app claimed it, and
 * which sign-in methods that app registered.
 *
 * The server has always known this and never said it out loud. An app
 * registers a method list, the server enforces it with a 403, and the card had
 * no way to read the list — so it drew buttons that were guaranteed to fail
 * and you discovered which ones a click at a time. Asking up front turns that
 * into a button that was never drawn.
 *
 * `/apps/me` is readable from any origin, registered or not, which is the
 * other half of its job: a request blocked by CORS has no response to inspect,
 * so "the deployment is up and doesn't know you" is otherwise indistinguishable
 * from "the deployment isn't there". This answers, and `errors.ts` turns the
 * answer into a sentence with a command in it.
 */

export type AppRegistration = {
  /** The origin the deployment saw, or null when the request carried none. */
  origin: string | null;
  /**
   * Whether the deployment will accept calls from here at all.
   *
   * Not the same as `registered`, and conflating them is a real mistake: a
   * deployment's own site is trusted through `SITE_URL`/`TRUSTED_ORIGINS` and
   * has no row in the app registry, so "no app claimed this origin" says
   * nothing about whether requests work. `false` here — and only here — means
   * every call will be blocked before it's sent.
   *
   * Optional because a deployment older than this field won't send it, and
   * "can't tell" must not read as "blocked".
   */
  trusted?: boolean;
  /** Whether a registered app claimed this origin. Gates `methods`, nothing else. */
  registered: boolean;
  slug: string | null;
  name: string | null;
  /** The registered method ids. `null` means every method is allowed. */
  methods: string[] | null;
};

/**
 * Where to ask.
 *
 * An empty `baseURL` falls back to the current origin, which is exactly what
 * Better Auth's own client does with one — so a workbench or a test rendering
 * the card with nothing configured reaches the same place its auth calls do,
 * rather than silently skipping the probe.
 */
const originOf = (baseURL: string) => {
  const base = baseURL || (typeof window === "undefined" ? "" : window.location.origin);
  return base.replace(/\/$/, "");
};

const endpoint = (origin: string) => `${origin}/apps/me`;

/**
 * Held as a promise so the card, the error explainer and anything else asking
 * at the same moment share one request. Keyed by base URL, so two deployments
 * in one bundle don't answer each other's question.
 *
 * `undefined` resolves to "couldn't ask" — the deployment is unreachable —
 * which is a different answer from `{ registered: false }` and the whole
 * reason this is worth distinguishing.
 */
const pending = new Map<string, Promise<AppRegistration | undefined>>();

export function fetchAppRegistration(baseURL: string): Promise<AppRegistration | undefined> {
  const origin = originOf(baseURL);
  if (!origin) return Promise.resolve(undefined);

  const cached = pending.get(origin);
  if (cached) return cached;

  const request = fetch(endpoint(origin), { cache: "no-store" })
    .then((res) => (res.ok ? (res.json() as Promise<AppRegistration>) : undefined))
    .catch(() => undefined);
  pending.set(origin, request);
  return request;
}

/** Drops the cached answer, for after a registration has changed. */
export const forgetAppRegistration = (baseURL?: string) => {
  if (baseURL === undefined) pending.clear();
  else pending.delete(originOf(baseURL));
};

/**
 * This app's own registration, or `undefined` until it lands.
 *
 * Deliberately never blocks a render: the card shows every method it was asked
 * to show until the answer arrives, then narrows. Starting narrow and widening
 * would flash buttons into existence, and starting empty would look broken on
 * a deployment that never answers.
 */
export function useAppRegistration(enabled = true) {
  const baseURL = useAuthBaseURL();
  const [app, setApp] = useState<AppRegistration>();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let live = true;
    void fetchAppRegistration(baseURL).then((data) => {
      if (!live) return;
      setApp(data);
      setChecked(true);
    });
    return () => {
      live = false;
    };
  }, [enabled, baseURL]);

  return {
    app,
    /** True once the deployment has answered, however it answered. */
    checked,
    /**
     * Only when the deployment said so outright. An unreachable deployment and
     * one too old to answer the question both leave this false — a banner that
     * fired on "don't know" would appear on every offline dev server.
     */
    blocked: app?.trusted === false,
    /**
     * Whether `id` will work here. Unknown answers "yes" — an unreachable
     * deployment is a reason to show a real error on click, not to render an
     * empty card.
     */
    allows: (id: string) => !app?.methods || app.methods.includes(id),
  };
}
