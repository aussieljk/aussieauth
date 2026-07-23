import { describe, expect, it } from "vitest";
import { isDemoUser, isLocked } from "./demo";

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

describe("isDemoUser", () => {
  it("recognises only the shared account", () => {
    expect(isDemoUser({ email: "demo@aussieauth.com" })).toBe(true);
    expect(isDemoUser({ email: "lucas@example.com" })).toBe(false);
    expect(isDemoUser({ email: null })).toBe(false);
    expect(isDemoUser(null)).toBe(false);
    expect(isDemoUser(undefined)).toBe(false);
  });
});
