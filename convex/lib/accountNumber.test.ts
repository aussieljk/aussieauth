import { describe, expect, it } from "vitest";
import { formatAccountNumber, generateAccountNumber, normalize } from "./accountNumber";

/**
 * The account number is the entire credential — no email, no password, no
 * recovery. So the two things that matter are that it's actually unguessable,
 * and that the number a user was shown is the number that gets looked up.
 */

describe("generateAccountNumber", () => {
  it("is sixteen digits", () => {
    expect(generateAccountNumber()).toMatch(/^\d{16}$/);
  });

  it("does not repeat", () => {
    // Not a randomness test — just a guard against a constant or a seeded
    // generator sneaking in, which would hand every user the same account.
    const seen = new Set(Array.from({ length: 500 }, generateAccountNumber));
    expect(seen.size).toBe(500);
  });

  it("uses the whole digit range in every position", () => {
    // A modulo bug that clamped a position would quietly shrink the keyspace.
    const numbers = Array.from({ length: 400 }, generateAccountNumber);
    for (let i = 0; i < 16; i++) {
      const digits = new Set(numbers.map((n) => n[i]));
      expect(digits.size, `position ${i}`).toBeGreaterThan(7);
    }
  });
});

describe("normalize", () => {
  it("accepts the number back in the shape it was displayed", () => {
    // Sign-up shows "1234 5678 9012 3456"; people paste exactly that.
    const bare = "1234567890123456";
    expect(normalize(formatAccountNumber(bare))).toBe(bare);
  });

  it("strips whatever separators someone typed", () => {
    expect(normalize("1234-5678-9012-3456")).toBe("1234567890123456");
    expect(normalize("  1234 5678 9012 3456  ")).toBe("1234567890123456");
  });
});

describe("formatAccountNumber", () => {
  it("groups in fours without a trailing space", () => {
    expect(formatAccountNumber("1234567890123456")).toBe("1234 5678 9012 3456");
  });
});
