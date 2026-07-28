import { describe, expect, it, vi } from "vitest";

/**
 * `authClient` is imported at module scope all over this package and by every
 * app that embeds the card, so the two things worth pinning are that reading it
 * too early explains itself, and that once configured it is genuinely
 * transparent — Better Auth's client is a proxy of its own, and a wrapper that
 * flattens it breaks `signIn.email` in a way no type catches.
 */

const load = async () => {
  vi.resetModules();
  return import("./client");
};

describe("authClient before configuration", () => {
  it("says what to do instead of failing as undefined", async () => {
    const { authClient } = await load();
    expect(() => authClient.signIn).toThrow(/createAussieAuthClient/);
    expect(() => authClient.signIn).toThrow(/AussieAuthClientProvider/);
  });

  it("throws from requireAuthClient too", async () => {
    const { requireAuthClient } = await load();
    expect(() => requireAuthClient()).toThrow(/no client yet/i);
  });
});

describe("authClient once configured", () => {
  it("reaches nested paths, the way Better Auth's own proxy expects", async () => {
    const { authClient, configureAussieAuthClientState } = await load();
    const email = vi.fn(() => Promise.resolve("signed in"));
    // Shaped like Better Auth's client: `signIn` is a callable proxy, not a
    // plain object, so a wrapper that binds it would lose `.email` entirely.
    const fake = {
      signIn: new Proxy({} as { email: typeof email }, { get: () => email }),
      useSession: () => ({ data: null }),
    };

    configureAussieAuthClientState(fake as never, { baseURL: "https://auth.test" });

    const reached = authClient as unknown as typeof fake;
    await expect(reached.signIn.email()).resolves.toBe("signed in");
    expect(email).toHaveBeenCalled();
  });

  it("reports the base URL the probe endpoint is built from", async () => {
    const client = await load();
    client.configureAussieAuthClientState({} as never, { baseURL: "https://auth.test" });
    expect(client.baseURL).toBe("https://auth.test");
  });
});

describe("callbackURL", () => {
  it("falls back to a relative root where there is no window", async () => {
    // This file runs in node, which is also what a prerender pass looks like:
    // reading `window.location` there would crash the build rather than
    // produce a URL.
    const { callbackURL } = await load();
    expect(callbackURL()).toBe("/");
  });

  it("takes a fixed string", async () => {
    const { callbackURL, configureAussieAuthClientState } = await load();
    configureAussieAuthClientState({} as never, {
      baseURL: "https://auth.test",
      callbackURL: "https://app.test/done",
    });
    expect(callbackURL()).toBe("https://app.test/done");
  });

  it("takes a function, and calls it per use rather than once", async () => {
    const { callbackURL, configureAussieAuthClientState } = await load();
    let n = 0;
    configureAussieAuthClientState({} as never, {
      baseURL: "https://auth.test",
      callbackURL: () => `https://app.test/${++n}`,
    });
    expect(callbackURL()).toBe("https://app.test/1");
    expect(callbackURL()).toBe("https://app.test/2");
  });
});
