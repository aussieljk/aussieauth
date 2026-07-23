import { expect, test } from "vitest";

/**
 * The tests must not be able to reach a real deployment.
 *
 * `convex dev` writes the deployment URL into `.env.local`, Vite loads that for
 * every mode, and `msw` is configured to bypass requests no fixture mocked. Put
 * together, a component test signs in against production-ish infrastructure and
 * nobody notices until the deployment logs fill with disconnects.
 *
 * `.env.test` blanks the variable, which makes every auth URL relative to the
 * test server. This asserts that file is still doing its job — it's the sort of
 * thing that gets undone by a stray `envDir` or a renamed mode.
 */
test("the test environment has no deployment to talk to", () => {
  expect(import.meta.env.VITE_CONVEX_SITE_URL || "").toBe("");
  expect(import.meta.env.VITE_CONVEX_URL || "").toBe("");
});
