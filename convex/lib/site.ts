/**
 * Where this deployment thinks it lives, and who else is allowed to speak for
 * it.
 *
 * Every one of these was previously worked out at each call site — the same
 * `SITE_URL ?? localhost` default in two files, the same comma-split of
 * `TRUSTED_ORIGINS` in two files, and the related-origins list assembled twice
 * with a comment admitting the duplication. They are all answers to the same
 * question, and an auth server that answers it two ways will eventually answer
 * it two *different* ways.
 *
 * Pure on purpose: nothing here reads `env` or touches the database, so the
 * callers stay responsible for fetching and this stays testable.
 */

import { capToRelatedOriginLimit } from "./apps";
import { isDevOrigin } from "./registration";

/** Where the browser is when nothing says otherwise: the Vite dev server. */
export const DEFAULT_SITE_URL = "http://localhost:5173";

/** `TRUSTED_ORIGINS` is one comma-separated string; this is the list in it. */
export const parseOrigins = (csv: string | undefined | null): string[] =>
  (csv ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

/**
 * Whether this deployment is only ever serving the developer's own browser.
 *
 * The signal is `SITE_URL`, because that's where the links we send actually
 * point: if it names a real domain, real people are reading real email, and
 * the conveniences that make local development pleasant stop being safe. Used
 * by `notify.ts` to decide whether printing a magic link to the logs is a
 * feature or a leak.
 *
 * A Convex dev deployment is still cloud-hosted, so the deployment URL says
 * nothing about this — `giddy-dinosaur-765.convex.site` serves both.
 */
export const isLocalSite = (siteUrl: string | undefined | null): boolean => {
  try {
    const { hostname } = new URL(siteUrl || DEFAULT_SITE_URL);
    return (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "::1"
    );
  } catch {
    // An unparseable SITE_URL is not evidence of being local. Treating it as
    // local is the failure that lets production log its own reset links.
    return false;
  }
};

/**
 * The origins allowed to use this deployment's passkeys, and the ones a
 * browser will ignore.
 *
 * Web origins only: `/.well-known/webauthn` is read by a browser, which can do
 * nothing with a native scheme, and every entry costs against the five-label
 * cap — so letting `exp://` through would push a real origin off the end.
 *
 * Development origins go last, and that ordering is load-bearing. Every new
 * project on this machine registers a `<name>.localhost` of its own, and each
 * one is a distinct label as far as the cap is concerned — so in first-come
 * order a handful of scratch projects would quietly cost a live app its
 * passkeys. Sorted this way, a dev origin can only ever take a slot no real
 * origin wanted.
 */
export const passkeyOrigins = ({
  siteUrl,
  envOrigins,
  appOrigins,
}: {
  siteUrl: string;
  envOrigins: string[];
  appOrigins: string[];
}) => {
  const web = [siteUrl, ...envOrigins, ...appOrigins]
    .filter((origin) => /^https?:\/\//.test(origin))
    .filter((origin, i, all) => all.indexOf(origin) === i);
  // Stable within each group, so the order two production origins were
  // registered in still decides which of them wins a contested slot.
  const ordered = [...web.filter((o) => !isDevOrigin(o)), ...web.filter(isDevOrigin)];
  return capToRelatedOriginLimit(ordered);
};
