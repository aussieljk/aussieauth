import { ed25519 } from "@noble/curves/ed25519.js";
import bs58 from "bs58";
import { describe, expect, it } from "vitest";
import { buildMessage, verifySignature } from "./solana";

/**
 * Sign In With Solana is the one method we implement the cryptography for
 * ourselves — Better Auth's `siwe` only speaks Ethereum. A bug here is a
 * sign-in-as-anyone bug, so the checks it makes are worth pinning down.
 */

/** A throwaway wallet. A Solana address *is* its ed25519 public key. */
const wallet = () => {
  const secretKey = ed25519.utils.randomSecretKey();
  const publicKey = ed25519.getPublicKey(secretKey);
  return {
    address: bs58.encode(publicKey),
    sign: (message: string) =>
      bs58.encode(ed25519.sign(new TextEncoder().encode(message), secretKey)),
  };
};

const challenge = (address: string) => buildMessage("aussieauth.com", address, "nonce-1234567890");

describe("verifySignature", () => {
  it("accepts a signature over the exact challenge", () => {
    const w = wallet();
    const message = challenge(w.address);
    expect(verifySignature(message, w.sign(message), w.address)).toBe(true);
  });

  it("rejects a signature made by a different wallet", () => {
    const owner = wallet();
    const attacker = wallet();
    const message = challenge(owner.address);
    // The attacker signs the victim's challenge — correct message, wrong key.
    expect(verifySignature(message, attacker.sign(message), owner.address)).toBe(false);
  });

  it("rejects a signature over a different message", () => {
    const w = wallet();
    const signed = challenge(w.address);
    const claimed = buildMessage("aussieauth.com", w.address, "other-nonce");
    // This is what makes the stored challenge load-bearing: a signature can't
    // be lifted from one sign-in and replayed against another's nonce.
    expect(verifySignature(claimed, w.sign(signed), w.address)).toBe(false);
  });

  it("rejects a tampered message", () => {
    const w = wallet();
    const message = challenge(w.address);
    const signature = w.sign(message);
    expect(
      verifySignature(message.replace("aussieauth.com", "evil.com"), signature, w.address),
    ).toBe(false);
  });

  it("returns false rather than throwing on malformed input", () => {
    const w = wallet();
    const message = challenge(w.address);
    // Undecodable base58, right-shaped-but-wrong-length, and empty strings all
    // arrive straight from a request body, so they must not surface as a 500.
    expect(verifySignature(message, "not base58 !!!", w.address)).toBe(false);
    expect(verifySignature(message, w.sign(message), "not base58 !!!")).toBe(false);
    expect(verifySignature(message, bs58.encode(new Uint8Array(8)), w.address)).toBe(false);
    expect(verifySignature(message, "", "")).toBe(false);
  });
});

describe("buildMessage", () => {
  it("names the domain and the address being proved", () => {
    const message = buildMessage("aussieauth.com", "SoLaNaAddr", "n0nce");
    expect(message).toContain("aussieauth.com");
    expect(message).toContain("SoLaNaAddr");
    expect(message).toContain("n0nce");
  });

  it("says signing costs nothing, so the wallet prompt isn't alarming", () => {
    expect(buildMessage("aussieauth.com", "addr", "n")).toContain("no gas");
  });
});
