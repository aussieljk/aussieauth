import { describe, expect, it } from "vitest";
import type { AppRegistration } from "./appInfo";
import { explainAussieAuthError } from "./errors";

/**
 * Three failures account for nearly every failed first integration, and the
 * whole value of this module is that each one comes back as a sentence with a
 * command in it. So that's what's asserted: not the exact wording, but that
 * the message names the fix.
 */

const app = (over: Partial<AppRegistration> = {}): AppRegistration => ({
  origin: "https://myapp.com",
  trusted: true,
  registered: true,
  slug: "myapp",
  name: "My App",
  methods: null,
  ...over,
});

describe("a blocked request", () => {
  const blocked = new TypeError("Failed to fetch");

  it("names the origin and the command when the deployment says it isn't trusted", () => {
    const message = explainAussieAuthError(blocked, {
      baseURL: "https://a.convex.site",
      app: app({ trusted: false, registered: false, slug: null, name: null }),
    });
    expect(message).toContain("https://myapp.com");
    expect(message).toContain("aussieauth apps register");
    expect(message).toContain("--origin https://myapp.com");
  });

  it("names the .convex.cloud mistake when nothing answered", () => {
    // The single most common way to get here, and invisible unless something
    // says the two host names out loud.
    const message = explainAussieAuthError(blocked, {
      baseURL: "https://a.convex.cloud",
    });
    expect(message).toContain(".convex.cloud");
    expect(message).toContain("https://a.convex.site");
  });

  it("does not blame the URL when the URL is right", () => {
    const message = explainAussieAuthError(blocked, { baseURL: "https://a.convex.site" });
    expect(message).not.toContain(".convex.cloud");
    expect(message).toContain("aussieauth apps register");
  });

  it("stops blaming registration once the deployment says the origin is trusted", () => {
    const message = explainAussieAuthError(blocked, {
      baseURL: "https://a.convex.site",
      app: app(),
    });
    expect(message).not.toContain("apps register");
    expect(message).toContain("network");
  });

  it("tells a native app to register a scheme, not an origin", () => {
    // An Expo Go origin carries a LAN address that changes with the network,
    // so `--origin` would be right until you moved rooms.
    const message = explainAussieAuthError(new Error("Network request failed"), {
      baseURL: "https://a.convex.site",
      scheme: "myapp://",
      app: app({ trusted: false, registered: false }),
    });
    expect(message).toContain("--scheme myapp");
    expect(message).toContain("--dev-exp");
  });
});

describe("a method the app didn't register", () => {
  const forbidden = new Error("My App doesn't offer that sign-in method.");

  it("says where the list lives and what to run", () => {
    const message = explainAussieAuthError(forbidden, {
      method: "email-password",
      app: app({ methods: ["google", "passkey"] }),
    });
    expect(message).toContain("google, passkey");
    expect(message).toContain("not email-password");
    // The suggested command carries the existing list plus the missing one, so
    // pasting it doesn't silently drop the methods already registered.
    expect(message).toContain("--methods google,passkey,email-password");
  });

  it("still names the method when the registration couldn't be read", () => {
    const message = explainAussieAuthError(forbidden, { method: "solana" });
    expect(message).toContain("solana");
    expect(message).toContain("aussieauth apps register");
  });
});

describe("a provider with no credentials", () => {
  it("names the variables and the command that sets them", () => {
    const message = explainAussieAuthError(new Error("Provider not found"), { method: "google" });
    expect(message).toContain("GOOGLE_CLIENT_ID");
    expect(message).toContain("GOOGLE_CLIENT_SECRET");
    expect(message).toContain("convex env set");
  });

  it("falls back to something true when the method is unknown", () => {
    const message = explainAussieAuthError(new Error("Provider not found"));
    expect(message).toContain("credentials");
  });
});

describe("anything else", () => {
  it("is passed through untouched", () => {
    // A real message from the server beats a worse guess from us.
    expect(explainAussieAuthError(new Error("Invalid email or password"))).toBe(
      "Invalid email or password",
    );
  });

  it("survives being handed something that isn't an Error", () => {
    expect(explainAussieAuthError("plain string")).toBe("plain string");
    expect(explainAussieAuthError({ message: "from a result object" })).toBe(
      "from a result object",
    );
  });
});
