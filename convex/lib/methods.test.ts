import { describe, expect, it } from "vitest";
import {
  isEnforceablePath,
  LOGIN_METHOD_PATHS,
  methodForRequest,
  resolveLoginMethod,
} from "./methods";

/**
 * This map decides two things at once: what gets recorded as your last-used
 * method, and whether an app was allowed to use it. A wrong entry either
 * mislabels an account or locks someone out, so both readings are pinned here.
 */

describe("methodForRequest", () => {
  it("resolves credential and passwordless paths by path alone", () => {
    expect(methodForRequest("/sign-in/email", {})).toBe("email-password");
    expect(methodForRequest("/sign-in/username", {})).toBe("username-password");
    expect(methodForRequest("/sign-in/email-otp", {})).toBe("email-otp");
    expect(methodForRequest("/sign-in/account-number", {})).toBe(
      "account-number",
    );
    expect(methodForRequest("/sign-in/solana", {})).toBe("solana");
  });

  it("catches social sign-in at the request, not the callback", () => {
    // The whole point: blocking at /callback/google would be after the user
    // has already been bounced to Google and consented.
    expect(methodForRequest("/sign-in/social", { provider: "google" })).toBe(
      "google",
    );
    expect(methodForRequest("/link-social", { provider: "github" })).toBe(
      "github",
    );
  });

  it("still resolves the callback, as a second line of defence", () => {
    expect(methodForRequest("/callback/google", {}, { id: "google" })).toBe(
      "google",
    );
    expect(methodForRequest("/oauth2/callback/github", {}, {})).toBe("github");
  });

  it("returns null for a social request with no usable provider", () => {
    // Null means "unrecognised", and the caller lets it through — better than
    // guessing a provider and blocking the wrong thing.
    expect(methodForRequest("/sign-in/social", {})).toBeNull();
    expect(methodForRequest("/sign-in/social", { provider: 42 })).toBeNull();
  });

  it("returns null for paths it doesn't know", () => {
    expect(methodForRequest("/get-session", {})).toBeNull();
    expect(methodForRequest(undefined, {})).toBeNull();
  });
});

describe("isEnforceablePath", () => {
  it("covers every path the map can resolve", () => {
    // Guards the real failure mode: adding a method to the map but not to the
    // prefix list, so enforcement silently skips it.
    for (const path of Object.keys(LOGIN_METHOD_PATHS)) {
      expect(isEnforceablePath(path), path).toBe(true);
    }
    expect(isEnforceablePath("/sign-in/social")).toBe(true);
    expect(isEnforceablePath("/callback/google")).toBe(true);
  });

  it("skips paths that can't start a sign-in", () => {
    for (const path of [
      "/get-session",
      "/sign-out",
      "/list-accounts",
      "/aussieauth/status",
      undefined,
    ]) {
      expect(isEnforceablePath(path), String(path)).toBe(false);
    }
  });
});

describe("resolveLoginMethod", () => {
  it("answers in provider ids for social callbacks", () => {
    expect(
      resolveLoginMethod({
        path: "/callback/google",
        params: { id: "google" },
      }),
    ).toBe("google");
  });

  it("agrees with methodForRequest on shared paths", () => {
    for (const path of Object.keys(LOGIN_METHOD_PATHS)) {
      expect(resolveLoginMethod({ path }), path).toBe(
        methodForRequest(path, {}),
      );
    }
  });
});
