import { describe, expect, it } from "vitest";
import { capToRelatedOriginLimit } from "./apps";

/**
 * The WebAuthn related-origins limit counts distinct sites, not origins. Going
 * over it doesn't fail loudly — the browser just ignores the tail — so the
 * arithmetic here is the difference between passkeys working on an app and
 * silently not.
 */

describe("capToRelatedOriginLimit", () => {
  it("keeps everything under the limit", () => {
    const origins = ["https://a.com", "https://b.com", "https://c.com"];
    expect(capToRelatedOriginLimit(origins)).toEqual({
      kept: origins,
      dropped: [],
    });
  });

  it("charges several origins on one site only once", () => {
    // Six origins, two sites — comfortably legal, and the naive
    // count-the-origins version would have dropped one.
    const origins = [
      "https://a.com",
      "https://www.a.com",
      "https://staging.a.com",
      "https://b.com",
      "https://www.b.com",
      "http://b.com:3000",
    ];
    expect(capToRelatedOriginLimit(origins).dropped).toEqual([]);
  });

  it("drops sites past the fifth, keeping the earlier ones", () => {
    const origins = [
      "https://one.com",
      "https://two.com",
      "https://three.com",
      "https://four.com",
      "https://five.com",
      "https://six.com",
      "https://seven.com",
    ];
    const { kept, dropped } = capToRelatedOriginLimit(origins);
    expect(kept).toHaveLength(5);
    // Order matters: this site is first in the list, so it can never be the
    // one that gets dropped.
    expect(kept[0]).toBe("https://one.com");
    expect(dropped).toEqual(["https://six.com", "https://seven.com"]);
  });

  it("still admits a sixth origin on an already-counted site", () => {
    const origins = [
      "https://one.com",
      "https://two.com",
      "https://three.com",
      "https://four.com",
      "https://five.com",
      "https://app.one.com",
    ];
    expect(capToRelatedOriginLimit(origins).dropped).toEqual([]);
  });

  it("treats localhost as its own site", () => {
    const { dropped } = capToRelatedOriginLimit([
      "http://localhost:5173",
      "http://localhost:4321",
    ]);
    expect(dropped).toEqual([]);
  });

  it("doesn't throw on an unparseable entry", () => {
    expect(() => capToRelatedOriginLimit(["not a url"])).not.toThrow();
  });
});
