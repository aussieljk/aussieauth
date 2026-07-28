import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_URL, isLocalSite, parseOrigins, passkeyOrigins } from "./site";

describe("isLocalSite", () => {
  /**
   * This decides whether a missing Resend key means "print the magic link to
   * the logs" or "refuse to pretend you sent it", so a wrong `true` is a
   * credential in a log file.
   */
  it("recognises the shapes a dev site actually takes", () => {
    for (const url of [
      "http://localhost:5173",
      "http://localhost",
      "https://aussieauth.localhost",
      "http://127.0.0.1:5173",
      "http://[::1]:5173",
    ]) {
      expect(isLocalSite(url), url).toBe(true);
    }
  });

  it("treats an unset SITE_URL as the dev server it defaults to", () => {
    expect(isLocalSite(undefined)).toBe(true);
    expect(isLocalSite("")).toBe(true);
    expect(isLocalSite(DEFAULT_SITE_URL)).toBe(true);
  });

  it("says no to anything a real person could receive mail from", () => {
    for (const url of [
      "https://aussieauth.com",
      "https://staging.aussieauth.com",
      "https://giddy-dinosaur-765.convex.site",
      // The lookalikes: a domain is not local because it contains the word.
      "https://localhost.evil.com",
      "https://notlocalhost",
      "https://mylocalhost.com",
    ]) {
      expect(isLocalSite(url), url).toBe(false);
    }
  });

  it("fails closed on something it can't parse", () => {
    expect(isLocalSite("not a url")).toBe(false);
  });
});

describe("parseOrigins", () => {
  it("splits, trims and drops the empties", () => {
    expect(parseOrigins("https://a.com, https://b.com ,, https://c.com")).toEqual([
      "https://a.com",
      "https://b.com",
      "https://c.com",
    ]);
  });

  it("is empty when the variable is unset", () => {
    expect(parseOrigins(undefined)).toEqual([]);
    expect(parseOrigins("")).toEqual([]);
    expect(parseOrigins("  ")).toEqual([]);
  });
});

describe("passkeyOrigins", () => {
  it("puts this site first, then env, then registered apps", () => {
    const { kept } = passkeyOrigins({
      siteUrl: "https://aussieauth.com",
      envOrigins: ["https://dev.aussieauth.com"],
      appOrigins: ["https://myapp.com"],
    });
    expect(kept).toEqual([
      "https://aussieauth.com",
      "https://dev.aussieauth.com",
      "https://myapp.com",
    ]);
  });

  it("leaves out native schemes, which no browser can act on", () => {
    const { kept } = passkeyOrigins({
      siteUrl: "https://aussieauth.com",
      envOrigins: ["exp://"],
      appOrigins: ["aussieauthios://", "https://myapp.com"],
    });
    expect(kept).toEqual(["https://aussieauth.com", "https://myapp.com"]);
  });

  it("does not spend a label twice on the same origin", () => {
    const { kept } = passkeyOrigins({
      siteUrl: "https://aussieauth.com",
      envOrigins: ["https://aussieauth.com"],
      appOrigins: ["https://aussieauth.com"],
    });
    expect(kept).toEqual(["https://aussieauth.com"]);
  });

  it("fits five distinct sites and reports the sixth as dropped", () => {
    const apps = ["a", "b", "c", "d", "e"].map((label) => `https://${label}.com`);
    const { kept, dropped } = passkeyOrigins({
      siteUrl: "https://aussieauth.com",
      envOrigins: [],
      appOrigins: apps,
    });
    // This site plus the first four apps is the whole budget.
    expect(kept).toEqual(["https://aussieauth.com", ...apps.slice(0, 4)]);
    expect(dropped).toEqual(["https://e.com"]);
  });

  it("still admits another origin on a site already counted", () => {
    const { dropped } = passkeyOrigins({
      siteUrl: "https://aussieauth.com",
      envOrigins: [],
      appOrigins: [
        "https://a.com",
        "https://b.com",
        "https://c.com",
        "https://d.com",
        // Sixth origin, but only the fifth label — staging is free.
        "https://staging.d.com",
      ],
    });
    expect(dropped).toEqual([]);
  });
});
