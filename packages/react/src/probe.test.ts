import { describe, expect, it } from "vitest";
import { explainProbe, probeDeployment } from "./probe";

/**
 * The real incident: the published client expected `/apps/me`, the hosted
 * deployment predated that route, and every other endpoint answered. Setup
 * looked finished and failed later somewhere else. These tests pin the four
 * ways a deployment can be wrong and the sentence each one produces.
 */

const server =
  (routes: Record<string, number | { status: number; body: unknown }>) =>
  async (input: string | URL) => {
    const path = new URL(input).pathname;
    const route = routes[path];
    if (route === undefined) return new Response("Not found", { status: 404 });
    const { status, body } = typeof route === "number" ? { status: route, body: {} } : route;
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  };

const CURRENT = {
  "/api/auth/ok": 200,
  "/api/auth/convex/jwks": 200,
  "/apps/health": {
    status: 200,
    body: { ok: true, features: ["apps/me", "dev-origins", "health"], registrationOpen: true },
  },
} as const;

describe("probeDeployment", () => {
  it("passes a current deployment", async () => {
    const probe = await probeDeployment("https://x.convex.site", server({ ...CURRENT }) as never);
    expect(probe.reachable && probe.servesAuth && probe.publishesKeys && probe.health).toBe(true);
    expect(probe.missing).toEqual([]);
    expect(explainProbe(probe)).toBe("");
  });

  it("calls a deployment that answers nothing unreachable", async () => {
    const probe = await probeDeployment("https://x.convex.site", (async () => {
      throw new TypeError("Failed to fetch");
    }) as never);
    expect(probe.reachable).toBe(false);
    expect(explainProbe(probe)).toContain(".convex.site, not .convex.cloud");
  });

  it("names the mistake when the URL is an app's own Convex deployment", async () => {
    // Reachable, and serves no auth — which is exactly what an app's own
    // deployment looks like, and the mistake that started all of this.
    const probe = await probeDeployment(
      "https://app.convex.site",
      server({ "/apps/origins": 200 }) as never,
    );
    expect(probe.reachable).toBe(true);
    expect(probe.servesAuth).toBe(false);
    expect(explainProbe(probe)).toContain("serves no auth");
  });

  it("calls a deployment without /apps/health old, not broken", async () => {
    const probe = await probeDeployment(
      "https://x.convex.site",
      server({ "/api/auth/ok": 200, "/api/auth/convex/jwks": 200 }) as never,
    );
    expect(probe.health).toBe(false);
    expect(explainProbe(probe)).toContain("older than this client");
  });

  it("names the missing capability when health answers an old feature list", async () => {
    const probe = await probeDeployment(
      "https://x.convex.site",
      server({
        "/api/auth/ok": 200,
        "/api/auth/convex/jwks": 200,
        "/apps/health": { status: 200, body: { ok: true, features: ["health"] } },
      }) as never,
    );
    expect(probe.missing).toEqual(["apps/me", "dev-origins"]);
    expect(explainProbe(probe)).toContain("apps/me");
  });

  it("reports a deployment that mints tokens nothing can verify", async () => {
    const probe = await probeDeployment(
      "https://x.convex.site",
      server({ "/api/auth/ok": 200 }) as never,
    );
    expect(explainProbe(probe)).toContain("publishes no JWKS");
  });
});
