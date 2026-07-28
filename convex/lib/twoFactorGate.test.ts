import type { BetterAuthPlugin } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { describe, expect, it } from "vitest";
import { gateTwoFactor, TWO_FACTOR_PATHS } from "./twoFactorGate";

/**
 * The gap this closes is invisible from the outside: the endpoint still answers
 * 200 with a session, it just never asked for the second factor. So these run
 * against the *real* plugin rather than a stand-in — the thing worth pinning is
 * that Better Auth's own matcher is the one being widened, and that it still
 * has the shape we widened it against.
 */

const matchers = (plugin: BetterAuthPlugin) =>
  (plugin.hooks?.after ?? []).map((hook) => (path: string) => hook.matcher({ path } as never));

const matchesSomewhere = (plugin: BetterAuthPlugin, path: string) =>
  matchers(plugin).some((matches) => matches(path));

describe("gateTwoFactor", () => {
  const plain = twoFactor({ issuer: "Test" });
  const gated = gateTwoFactor(plain);

  it("leaves the paths Better Auth already gates alone", () => {
    for (const path of ["/sign-in/email", "/sign-in/username", "/sign-in/phone-number"]) {
      expect(matchesSomewhere(plain, path)).toBe(true);
      expect(matchesSomewhere(gated, path)).toBe(true);
    }
  });

  it("gates the endpoints AussieAuth wrote itself, which it did not", () => {
    for (const path of TWO_FACTOR_PATHS) {
      expect(matchesSomewhere(plain, path)).toBe(false);
      expect(matchesSomewhere(gated, path)).toBe(true);
    }
  });

  it("does not gate sign-ups, which have no enrolled factor to skip", () => {
    for (const path of ["/sign-up/account-number", "/sign-in/anonymous", "/sign-in/demo"]) {
      expect(matchesSomewhere(gated, path)).toBe(false);
    }
  });

  it("keeps everything else about the plugin", () => {
    expect(gated.id).toBe(plain.id);
    expect(gated.endpoints).toBe(plain.endpoints);
    expect(gated.schema).toBe(plain.schema);
    expect(gated.hooks?.after).toHaveLength(plain.hooks?.after?.length ?? 0);
  });

  it("refuses to look gated when there is no sign-in hook to widen", () => {
    // What an upgrade that moved the challenge elsewhere would look like.
    expect(() => gateTwoFactor({ id: "two-factor" })).toThrow(/no sign-in hook/);
    expect(() =>
      gateTwoFactor({
        id: "two-factor",
        hooks: { after: [{ matcher: () => false, handler: (async () => {}) as never }] },
      }),
    ).toThrow(/no sign-in hook/);
  });
});
