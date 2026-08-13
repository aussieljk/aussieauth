import { describe, expect, it } from "vitest";
import {
  isDevOrigin,
  secretlessOrigins,
  isOrigin,
  isSchemeOrigin,
  parseRegistration,
  secretMatches,
} from "./registration";

/**
 * Registration is the one endpoint where a stranger can change what this
 * server trusts. These two functions are the whole gate.
 */

describe("secretMatches", () => {
  const secret = "s3cret-provisioning-key";

  it("accepts the exact secret", () => {
    expect(secretMatches(secret, secret)).toBe(true);
  });

  it("rejects near misses", () => {
    // A prefix must not pass: that's the bug that turns a brute force from
    // impossible into one-character-at-a-time.
    expect(secretMatches("s3cret", secret)).toBe(false);
    expect(secretMatches(secret + "x", secret)).toBe(false);
    expect(secretMatches("S3CRET-PROVISIONING-KEY", secret)).toBe(false);
    expect(secretMatches(secret.slice(0, -1) + "!", secret)).toBe(false);
  });

  it("rejects empty input", () => {
    // The header is absent far more often than it's wrong, and "" must never
    // match — including against an accidentally empty configured secret.
    expect(secretMatches("", secret)).toBe(false);
    expect(secretMatches("anything", "")).toBe(false);
  });
});

describe("isOrigin", () => {
  it("accepts bare http(s) origins", () => {
    expect(isOrigin("https://myapp.com")).toBe(true);
    expect(isOrigin("http://localhost:5173")).toBe(true);
  });

  it("rejects anything carrying more than an origin", () => {
    // A path or trailing slash would never match a browser's Origin header,
    // so accepting it would register an app that silently never works.
    expect(isOrigin("https://myapp.com/")).toBe(false);
    expect(isOrigin("https://myapp.com/login")).toBe(false);
    expect(isOrigin("myapp.com")).toBe(false);
    expect(isOrigin("javascript:alert(1)")).toBe(false);
    expect(isOrigin("")).toBe(false);
  });
});

describe("isSchemeOrigin", () => {
  it("accepts a bare app scheme", () => {
    expect(isSchemeOrigin("aussieauthios://")).toBe(true);
    // Expo Go's scheme, which every project shares while running under it.
    expect(isSchemeOrigin("exp://")).toBe(true);
    expect(isSchemeOrigin("my-app.v2+beta://")).toBe(true);
  });

  it("rejects anything past the bare scheme", () => {
    // These register as a *prefix*, so a path would claim far more than it
    // appears to — `exp://evil` would match `exp://evil.example.com/...`.
    expect(isSchemeOrigin("aussieauthios:///")).toBe(false);
    expect(isSchemeOrigin("exp://192.168.1.5:8081/--/")).toBe(false);
    expect(isSchemeOrigin("aussieauthios://callback")).toBe(false);
  });

  it("rejects http(s), which belongs to isOrigin", () => {
    // Left to `isOrigin` so a bare `https://` can never be registered — as a
    // prefix it would match every https origin in existence.
    expect(isSchemeOrigin("https://")).toBe(false);
    expect(isSchemeOrigin("http://")).toBe(false);
    expect(isSchemeOrigin("https://myapp.com")).toBe(false);
  });

  it("rejects malformed schemes", () => {
    expect(isSchemeOrigin("")).toBe(false);
    expect(isSchemeOrigin("://")).toBe(false);
    expect(isSchemeOrigin("1app://")).toBe(false);
    expect(isSchemeOrigin("app:/")).toBe(false);
    expect(isSchemeOrigin("app://x")).toBe(false);
  });
});

/**
 * `isDevOrigin` decides whether a registration needs a secret, so it is the
 * whole gate for secretless setup. The cases that matter are the near misses:
 * a public host that merely reads like a local one must not slip through,
 * because that would let anyone register any origin without credentials.
 */
describe("isDevOrigin", () => {
  it("accepts the loopback names on any port", () => {
    expect(isDevOrigin("http://localhost:5173")).toBe(true);
    expect(isDevOrigin("http://localhost:3000")).toBe(true);
    expect(isDevOrigin("http://127.0.0.1:8080")).toBe(true);
    expect(isDevOrigin("http://localhost")).toBe(true);
  });

  it("accepts the reserved local TLDs, which is what portless serves on", () => {
    expect(isDevOrigin("https://myapp.localhost")).toBe(true);
    expect(isDevOrigin("http://macbook.local:4000")).toBe(true);
  });

  it("accepts private LAN addresses, where an Expo dev server lands", () => {
    expect(isDevOrigin("http://192.168.1.5:8081")).toBe(true);
    expect(isDevOrigin("http://10.0.0.2:19000")).toBe(true);
    expect(isDevOrigin("http://172.16.4.1:3000")).toBe(true);
  });

  it("rejects public hosts, including ones that read as local", () => {
    expect(isDevOrigin("https://myapp.com")).toBe(false);
    // The trap: a real domain whose name contains a local one.
    expect(isDevOrigin("https://localhost.evil.com")).toBe(false);
    expect(isDevOrigin("https://notlocalhost.com")).toBe(false);
    // 172.32 is outside the private block, unlike 172.16–172.31.
    expect(isDevOrigin("http://172.32.0.1:3000")).toBe(false);
    // Routable, despite looking like a LAN address at a glance.
    expect(isDevOrigin("http://11.0.0.2")).toBe(false);
  });

  it("rejects anything that isn't a bare http(s) origin", () => {
    expect(isDevOrigin("http://localhost:3000/callback")).toBe(false);
    expect(isDevOrigin("myapp://")).toBe(false);
    expect(isDevOrigin("localhost:3000")).toBe(false);
    expect(isDevOrigin("")).toBe(false);
  });
});

describe("secretlessOrigins", () => {
  it("is true only when nothing in the list is a public origin", () => {
    expect(secretlessOrigins(["http://localhost:3000", "https://app.localhost"])).toBe(true);
    // Native apps come in this way: a scheme is claimable without a secret,
    // because otherwise the whole Expo path needs a human again.
    expect(secretlessOrigins(["myapp://", "exp://"])).toBe(true);
    // One public origin means the whole registration needs a secret.
    expect(secretlessOrigins(["http://localhost:3000", "https://myapp.com"])).toBe(false);
    expect(secretlessOrigins(["myapp://", "https://myapp.com"])).toBe(false);
  });

  it("is false for an empty list, so nothing is authorised by default", () => {
    expect(secretlessOrigins([])).toBe(false);
  });
});

describe("parseRegistration", () => {
  const valid = {
    slug: "portfolio",
    name: "Portfolio",
    origins: ["https://portfolio.com", "http://localhost:5173"],
  };

  it("accepts a well-formed registration", () => {
    const result = parseRegistration(valid);
    expect(result).toEqual({ app: { ...valid, methods: undefined } });
  });

  it("keeps methods when given and leaves them undefined when not", () => {
    expect(parseRegistration({ ...valid, methods: ["google", "passkey"] })).toMatchObject({
      app: { methods: ["google", "passkey"] },
    });
    // Undefined means "all methods" — importantly not "no methods", which
    // would lock the app out entirely.
    expect(parseRegistration(valid)).toMatchObject({
      app: { methods: undefined },
    });
  });

  it("dedupes origins", () => {
    const result = parseRegistration({
      ...valid,
      origins: ["https://a.com", "https://a.com"],
    });
    expect(result).toMatchObject({ app: { origins: ["https://a.com"] } });
  });

  it("rejects a bad slug", () => {
    for (const slug of ["", "Portfolio", "my app", "my_app", "-lead", "x".repeat(40)]) {
      expect(parseRegistration({ ...valid, slug }), slug).toHaveProperty("error");
    }
  });

  it("accepts app schemes alongside web origins", () => {
    // A native app registers its deep-link scheme the same way a site
    // registers its origin, so one app can claim both.
    const result = parseRegistration({
      ...valid,
      origins: ["https://portfolio.com", "aussieauthios://", "exp://"],
    });
    expect(result).toMatchObject({
      app: { origins: ["https://portfolio.com", "aussieauthios://", "exp://"] },
    });
  });

  it("rejects missing or empty origins", () => {
    expect(parseRegistration({ ...valid, origins: [] })).toHaveProperty("error");
    expect(parseRegistration({ ...valid, origins: "https://a.com" })).toHaveProperty("error");
    expect(parseRegistration({ ...valid, origins: ["https://a.com", 42] })).toHaveProperty("error");
  });

  it("rejects a blank name", () => {
    expect(parseRegistration({ ...valid, name: "   " })).toHaveProperty("error");
  });

  it("rejects non-objects", () => {
    for (const body of [null, undefined, "string", 42, []]) {
      expect(parseRegistration(body)).toHaveProperty("error");
    }
  });

  it("ignores unknown fields rather than trusting them", () => {
    // A caller can't smuggle extra columns through to the database.
    const result = parseRegistration({ ...valid, isAdmin: true });
    expect(result).toEqual({ app: { ...valid, methods: undefined } });
  });
});
