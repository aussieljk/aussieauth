import { createAussieAuthClient } from "@aussieljk/auth";

/**
 * AussieAuth's own site dogfoods the package it ships. This is the one place the
 * client is configured — evaluated at module load, before any sign-in UI
 * renders, so the package's `authClient` live binding and `localSignOut` resolve.
 *
 * `callbackURL` points at `/account` rather than `/` — `/` is the landing page,
 * so returning there would look like the sign-in silently failed.
 */
export const authClient = createAussieAuthClient({
  baseURL: import.meta.env.VITE_CONVEX_SITE_URL ?? "",
  callbackURL: () => `${window.location.origin}/account`,
});
