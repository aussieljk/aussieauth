import { describe, expect, it } from "vitest";
import { buildConfig, deploymentUrl, drift, PROXIED_PATHS } from "./generate-vercel-config";

/**
 * `vercel.json` is committed rather than built, because Vercel reads it before
 * it runs anything. That makes it the one file here that can silently point at
 * a deployment nobody uses any more — and the symptom would be Sign in with
 * Apple and cross-domain passkeys failing on production only.
 */
describe("vercel.json", () => {
  it("matches the deployment the app is pointed at", async () => {
    expect(await drift()).toBe(null);
  });

  it("proxies each path to the same path on the deployment", () => {
    const config = buildConfig("https://example.convex.site");
    expect(config.rewrites).toEqual(
      PROXIED_PATHS.map((path) => ({
        source: path,
        destination: `https://example.convex.site${path}`,
      })),
    );
  });

  it("does not double the slash when the URL has a trailing one", async () => {
    process.env.VITE_CONVEX_SITE_URL = "https://example.convex.site/";
    try {
      expect(await deploymentUrl()).toBe("https://example.convex.site");
    } finally {
      delete process.env.VITE_CONVEX_SITE_URL;
    }
  });

  it("covers the paths a third party insists live on our own domain", () => {
    // Each of these has someone on the other end that refuses to follow a
    // redirect elsewhere; dropping one is a silent feature outage.
    expect(PROXIED_PATHS).toContain("/api/auth/callback/apple");
    expect(PROXIED_PATHS).toContain("/.well-known/webauthn");
    expect(PROXIED_PATHS).toContain("/.well-known/apple-app-site-association");
    expect(PROXIED_PATHS).toContain("/.well-known/apple-developer-domain-association.txt");
  });
});
