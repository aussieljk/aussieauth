import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { generateRandomString } from "better-auth/crypto";
import { ed25519 } from "@noble/curves/ed25519.js";
import bs58 from "bs58";
import * as z from "zod";

/**
 * Sign In With Solana.
 *
 * Better Auth ships `siwe`, but it validates addresses against `0x[40 hex]` and
 * parses an "…with your Ethereum account" header, so it can't carry Solana.
 * The shape here is the same idea, minus the EVM assumptions: a Solana address
 * *is* an ed25519 public key, so verification is a plain signature check with
 * no recovery step.
 *
 * The server hands out the exact string to sign and remembers it. The client
 * never composes the message, so there's nothing to tamper with — and the
 * challenge is single-use, because verifying consumes it.
 */

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const identifier = (address: string) => `solana:${address}`;

const buildMessage = (domain: string, address: string, nonce: string) =>
  [
    `${domain} wants you to sign in with your Solana account:`,
    address,
    "",
    "Signing this message proves you control this wallet. It costs no gas and sends no transaction.",
    "",
    `Nonce: ${nonce}`,
  ].join("\n");

const verifySignature = (
  message: string,
  signature: string,
  address: string,
) => {
  try {
    return ed25519.verify(
      bs58.decode(signature),
      new TextEncoder().encode(message),
      bs58.decode(address),
    );
  } catch {
    return false;
  }
};

export const solana = ({ domain }: { domain: string }) =>
  ({
    id: "solana",
    schema: {
      solanaWallet: {
        fields: {
          userId: {
            type: "string",
            required: true,
            references: { model: "user", field: "id" },
          },
          address: { type: "string", required: true, unique: true },
          createdAt: { type: "date", required: true },
        },
      },
    },
    endpoints: {
      solanaChallenge: createAuthEndpoint(
        "/solana/challenge",
        {
          method: "POST",
          body: z.object({ address: z.string().min(32).max(64) }),
        },
        async (ctx) => {
          const message = buildMessage(
            domain,
            ctx.body.address,
            generateRandomString(32),
          );
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: identifier(ctx.body.address),
            value: message,
            expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
          });
          return ctx.json({ message });
        },
      ),

      signInSolana: createAuthEndpoint(
        "/sign-in/solana",
        {
          method: "POST",
          body: z.object({
            address: z.string().min(32).max(64),
            signature: z.string(),
          }),
        },
        async (ctx) => {
          const { address, signature } = ctx.body;

          const challenge =
            await ctx.context.internalAdapter.consumeVerificationValue(
              identifier(address),
            );
          if (!challenge) {
            throw new APIError("UNAUTHORIZED", {
              message: "Challenge expired — try again",
            });
          }
          if (!verifySignature(challenge.value, signature, address)) {
            throw new APIError("UNAUTHORIZED", {
              message: "Signature doesn't match that wallet",
            });
          }

          const wallet = await ctx.context.adapter.findOne<{ userId: string }>({
            model: "solanaWallet",
            where: [{ field: "address", value: address }],
          });

          let user = wallet
            ? await ctx.context.internalAdapter.findUserById(wallet.userId)
            : null;
          if (!user) {
            user = await ctx.context.internalAdapter.createUser({
              // Wallet users have no address to reach; keep it unroutable.
              email: `${address}@solana.invalid`,
              emailVerified: false,
              name: `${address.slice(0, 4)}…${address.slice(-4)}`,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            await ctx.context.adapter.create({
              model: "solanaWallet",
              data: { userId: user.id, address, createdAt: new Date() },
            });
          }

          const session = await ctx.context.internalAdapter.createSession(
            user.id,
          );
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ token: session.token, user });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
