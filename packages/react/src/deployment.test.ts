import { describe, expect, it } from "vitest";
import { deploymentUrl, detectFramework, parseEnvFile, siteUrlFromConvexUrl } from "./deployment";

/**
 * The URL derivation is the whole point of `aussieauth init`: the step that
 * bit hardest was choosing between `.convex.cloud` and `.convex.site`, both of
 * which are real URLs for the same deployment and only one of which serves
 * auth. Getting it wrong produces a network error with no response body, so
 * these are the assertions standing between a working scaffold and a silent
 * one.
 */

describe("siteUrlFromConvexUrl", () => {
  it("swaps the host auth is not served from", () => {
    expect(siteUrlFromConvexUrl("https://giddy-dinosaur-765.convex.cloud")).toBe(
      "https://giddy-dinosaur-765.convex.site",
    );
  });

  it("leaves a .convex.site URL alone", () => {
    expect(siteUrlFromConvexUrl("https://giddy-dinosaur-765.convex.site")).toBe(
      "https://giddy-dinosaur-765.convex.site",
    );
  });

  it("drops a trailing slash, so joining a path never doubles it", () => {
    expect(siteUrlFromConvexUrl("https://a.convex.cloud/")).toBe("https://a.convex.site");
  });

  it("only rewrites the host — a path that says cloud is not a host", () => {
    expect(siteUrlFromConvexUrl("https://a.convex.site/x.convex.cloud/y")).toBe(
      "https://a.convex.site/x.convex.cloud/y",
    );
  });
});

describe("parseEnvFile", () => {
  it("reads the shapes convex dev and humans both write", () => {
    expect(
      parseEnvFile(
        [
          "# a comment",
          "CONVEX_DEPLOYMENT=dev:giddy-dinosaur-765",
          'VITE_CONVEX_URL="https://giddy-dinosaur-765.convex.cloud"',
          "export AUSSIEAUTH_SECRET = 'sh h'",
          "not a variable",
        ].join("\n"),
      ),
    ).toEqual({
      CONVEX_DEPLOYMENT: "dev:giddy-dinosaur-765",
      VITE_CONVEX_URL: "https://giddy-dinosaur-765.convex.cloud",
      AUSSIEAUTH_SECRET: "sh h",
    });
  });
});

describe("deploymentUrl", () => {
  it("prefers an explicit AussieAuth URL", () => {
    expect(
      deploymentUrl({
        VITE_AUSSIEAUTH_URL: "https://explicit.convex.site",
        CONVEX_URL: "https://other.convex.cloud",
      }),
    ).toBe("https://explicit.convex.site");
  });

  it("corrects an explicit URL that names the wrong host", () => {
    // The mistake this whole path exists to prevent, made in the env file
    // rather than at the keyboard. Deriving is still better than obeying.
    expect(deploymentUrl({ VITE_AUSSIEAUTH_URL: "https://a.convex.cloud" })).toBe(
      "https://a.convex.site",
    );
  });

  it("falls back to the Convex URL", () => {
    expect(deploymentUrl({ NEXT_PUBLIC_CONVEX_URL: "https://a.convex.cloud" })).toBe(
      "https://a.convex.site",
    );
  });

  it("falls back to the deployment name convex dev writes", () => {
    expect(deploymentUrl({ CONVEX_DEPLOYMENT: "dev:giddy-dinosaur-765" })).toBe(
      "https://giddy-dinosaur-765.convex.site",
    );
    expect(deploymentUrl({ CONVEX_DEPLOYMENT: "prod:giddy-dinosaur-765" })).toBe(
      "https://giddy-dinosaur-765.convex.site",
    );
  });

  it("answers empty rather than guessing", () => {
    expect(deploymentUrl({})).toBe("");
  });
});

const none = () => false;

describe("detectFramework", () => {
  it("picks Expo over everything, because an Expo app has react and vite too", () => {
    expect(detectFramework({ expo: "*", vite: "*" }, none)).toBe("expo");
  });

  it("picks TanStack Start over vite, which it depends on", () => {
    expect(detectFramework({ "@tanstack/react-start": "*", vite: "*" }, none)).toBe(
      "tanstack-start",
    );
  });

  it("finds next", () => {
    expect(detectFramework({ next: "*" }, none)).toBe("next");
  });

  it("finds vite from a config file when it isn't a listed dependency", () => {
    expect(detectFramework({}, (f) => f === "vite.config.ts")).toBe("vite");
  });

  it("says so rather than guessing", () => {
    expect(detectFramework({ react: "*" }, none)).toBe("unknown");
  });
});
