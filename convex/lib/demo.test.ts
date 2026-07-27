import { describe, expect, it } from "vitest";
import { isDemoUser, isLocked } from "./demo";
import { LOGIN_METHOD_PATHS } from "./methods";

/**
 * The demo account is shared by every visitor, so its session is deliberately
 * read-only. `isLocked` is the whole of that boundary — if a path falls off
 * this list, the first visitor to call it owns `demo@aussieauth.com` for good.
 */

describe("isLocked", () => {
  it("blocks every way to acquire a credential", () => {
    for (const path of [
      "/linking/set-password",
      "/change-password",
      "/set-password",
      "/passkey/generate-register-options",
      "/passkey/verify-registration",
      "/api-key/create",
      "/phone-number/send-otp",
      "/email-otp/send-verification-otp",
      "/two-factor/enable",
    ]) {
      expect(isLocked(path), path).toBe(true);
    }
  });

  it("blocks every way to attach an identity", () => {
    for (const path of [
      "/change-email",
      "/update-user",
      "/delete-user",
      "/link-social",
      "/unlink-account",
      "/solana/link",
      "/solana/unlink",
    ]) {
      expect(isLocked(path), path).toBe(true);
    }
  });

  it("blocks locking everyone else out", () => {
    // Revoking sessions on a shared account signs out every other visitor.
    for (const path of ["/revoke-session", "/revoke-sessions", "/revoke-other-sessions"]) {
      expect(isLocked(path), path).toBe(true);
    }
  });

  it("leaves the session usable", () => {
    // A deny-list only works if the demo can still sign in, stay signed in and
    // sign out — these are the paths that would break the flow entirely.
    for (const path of [
      "/sign-in/demo",
      "/get-session",
      "/sign-out",
      "/list-accounts",
      "/solana/list",
      "/passkey/list-user-passkeys",
      "/api-key/list",
      "/convex/token",
      undefined,
    ]) {
      expect(isLocked(path), String(path)).toBe(false);
    }
  });

  it("does not match a path that merely contains a locked one", () => {
    // The matcher is a prefix test, so an endpoint added later under a
    // different root must not be caught by accident.
    expect(isLocked("/app/update-user")).toBe(false);
  });
});

/**
 * The paths that would let a demo session *acquire* each method's credential,
 * keyed by method id. An empty list is an explicit judgement that the method
 * mints nothing on an existing account (anonymous and account-number sign-up
 * create a fresh user; the demo endpoint is the way in, not a credential).
 *
 * Every method in the registry must appear here — that's the invariant. Add a
 * method to `LOGIN_METHOD_PATHS` (or a social provider) without classifying it
 * and the first test below fails, instead of the demo account quietly growing
 * a write path.
 */
const CREDENTIAL_PATHS: Record<string, string[]> = {
  "email-password": ["/set-password", "/change-password", "/linking/set-password"],
  // Claiming a username rides on the generic profile update.
  "username-password": ["/update-user"],
  "phone-password": ["/phone-number/send-otp", "/phone-number/verify"],
  "ios-otp": ["/phone-number/send-otp"],
  "email-otp": ["/email-otp/send-verification-otp"],
  // Owning the demo's magic links would mean owning its address.
  "magic-link": ["/change-email"],
  passkey: ["/passkey/generate-register-options", "/passkey/verify-registration"],
  solana: ["/solana/link"],
  google: ["/link-social"],
  github: ["/link-social"],
  apple: ["/link-social"],
  agent: ["/api-key/create"],
  demo: [],
  anonymous: [],
  "account-number": [],
};

describe("the deny-list covers the method registry", () => {
  // The registry: every path-mapped method, plus the social providers and
  // agent keys, which identify themselves by body or header rather than path.
  const registry = new Set([
    ...Object.values(LOGIN_METHOD_PATHS),
    "google",
    "github",
    "apple",
    "agent",
  ]);

  it("classifies every registered method", () => {
    for (const method of registry) {
      expect(CREDENTIAL_PATHS, `add "${method}" to CREDENTIAL_PATHS`).toHaveProperty(method);
    }
  });

  it("locks every credential-acquiring path", () => {
    for (const [method, paths] of Object.entries(CREDENTIAL_PATHS)) {
      for (const path of paths) {
        expect(isLocked(path), `${method}: ${path}`).toBe(true);
      }
    }
  });
});

describe("isDemoUser", () => {
  it("recognises only the shared account", () => {
    expect(isDemoUser({ email: "demo@aussieauth.com" })).toBe(true);
    expect(isDemoUser({ email: "lucas@example.com" })).toBe(false);
    expect(isDemoUser({ email: null })).toBe(false);
    expect(isDemoUser(null)).toBe(false);
    expect(isDemoUser(undefined)).toBe(false);
  });
});
