import { importPKCS8, SignJWT } from "jose";

/**
 * Apple's "client secret" isn't a secret you copy — it's an ES256 JWT you sign
 * with a .p8 key, and Apple rejects one dated more than six months out. Rather
 * than paste a token that quietly dies in half a year, we mint a fresh one per
 * request from the key itself.
 */

const SIX_MONTHS_S = 180 * 24 * 60 * 60;

/**
 * `.p8` files are PEM, and env vars flatten newlines depending on how they were
 * pasted — restore them so `importPKCS8` can parse the block.
 */
const asPem = (key: string) => key.replace(/\\n/g, "\n").trim();

export const appleClientSecret = async ({
  clientId,
  teamId,
  keyId,
  privateKey,
}: {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
}) => {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + SIX_MONTHS_S)
    .sign(await importPKCS8(asPem(privateKey), "ES256"));
};
