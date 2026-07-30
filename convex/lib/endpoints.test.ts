import { memoryAdapter } from "better-auth/adapters/memory";
import { betterAuth } from "better-auth";
import { anonymous, twoFactor, username } from "better-auth/plugins";
import { beforeEach, describe, expect, it } from "vitest";
import { accountNumber, formatAccountNumber } from "./accountNumber";
import { demo } from "./demo";
import { solana } from "./solana";
import { gateTwoFactor } from "./twoFactorGate";

/**
 * The endpoints, actually running.
 *
 * Everything else in this directory is tested as a pure function, which is
 * cheap and catches a lot — but not the class of bug that lives in the seam
 * between our endpoints and Better Auth's pipeline. The two-factor bypass was
 * exactly that: `/sign-in/account-number` returned 200 with a real session and
 * every unit test still passed, because the endpoint did precisely what it
 * said. What it didn't do was run the hook that asks for the second factor.
 *
 * So these drive a real Better Auth instance over the memory adapter, with the
 * plugins `convex/auth.ts` registers, and assert on what a caller gets back.
 * No Convex, because none of this is about the database.
 */

const SECRET = "test-secret-not-used-anywhere-real";

/**
 * The memory adapter throws on a model it has no array for rather than
 * creating one, so every table any registered plugin declares has to be here.
 */
const emptyDb = () => ({
  user: [],
  session: [],
  account: [],
  verification: [],
  twoFactor: [],
  solanaWallet: [],
});

const makeAuth = () =>
  betterAuth({
    baseURL: "https://auth.test",
    secret: SECRET,
    database: memoryAdapter(emptyDb()),
    emailAndPassword: { enabled: true },
    // Off, so a 429 from the three-per-ten-seconds sign-in rule doesn't turn
    // an assertion about behaviour into an assertion about timing.
    rateLimit: { enabled: false },
    plugins: [
      username(),
      anonymous({ emailDomainName: "anonymous.invalid" }),
      accountNumber(),
      demo(),
      solana({ domain: "auth.test" }),
      gateTwoFactor(twoFactor({ issuer: "Test" })),
    ],
  });

type Auth = ReturnType<typeof makeAuth>;

/** POSTs through the real router, so hooks run exactly as they do in prod. */
const post = async (
  auth: Auth,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) => {
  const response = await auth.handler(
    new Request(`https://auth.test/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body ?? {}),
    }),
  );
  const text = await response.text();
  return {
    status: response.status,
    body: text ? (JSON.parse(text) as Record<string, unknown>) : {},
    setCookie: response.headers.get("set-cookie") ?? "",
  };
};

/** Turns on TOTP for a user the way enrolment would, without the enrolment. */
const enrolTwoFactor = async (auth: Auth, userId: string) => {
  const ctx = await auth.$context;
  await ctx.internalAdapter.updateUser(userId, { twoFactorEnabled: true });
  await ctx.adapter.create({
    model: "twoFactor",
    data: { userId, secret: "JBSWY3DPEHPK3PXP", backupCodes: "" },
  });
};

let auth: Auth;
beforeEach(() => {
  auth = makeAuth();
});

describe("/sign-up/account-number", () => {
  it("issues a sixteen-digit number and signs you straight in", async () => {
    const { status, body, setCookie } = await post(auth, "/sign-up/account-number");
    expect(status).toBe(200);
    expect(body.accountNumber).toMatch(/^\d{16}$/);
    expect(body.token).toEqual(expect.any(String));
    expect(setCookie).toContain("session_token");
  });

  it("shows the number grouped but stores it bare, so sign-in matches", async () => {
    const signUp = await post(auth, "/sign-up/account-number");
    const number = signUp.body.accountNumber as string;
    const user = signUp.body.user as { name: string; username: string };

    expect(user.name).toBe(formatAccountNumber(number));
    expect(user.username).toBe(number);

    // Typed back in the shape it was displayed.
    const signIn = await post(auth, "/sign-in/account-number", {
      accountNumber: formatAccountNumber(number),
    });
    expect(signIn.status).toBe(200);
  });

  it("refuses an unknown number without saying which part was wrong", async () => {
    const { status, body } = await post(auth, "/sign-in/account-number", {
      accountNumber: "0000000000000000",
    });
    expect(status).toBe(401);
    expect(body.message).toBe("Unknown account number");
  });
});

describe("the two-factor gate", () => {
  /**
   * The regression this file was written for. Before `gateTwoFactor`, both of
   * these returned a session and never asked for the code.
   */
  it("interposes the challenge on account-number sign-in", async () => {
    const signUp = await post(auth, "/sign-up/account-number");
    const number = signUp.body.accountNumber as string;
    await enrolTwoFactor(auth, (signUp.body.user as { id: string }).id);

    const signIn = await post(auth, "/sign-in/account-number", { accountNumber: number });

    expect(signIn.status).toBe(200);
    expect(signIn.body.twoFactorRedirect).toBe(true);
    expect(signIn.body.twoFactorMethods).toContain("totp");
    // And no session came with it — the point of the gate.
    expect(signIn.body.token).toBeUndefined();
  });

  it("interposes it on wallet sign-in too", async () => {
    const ctx = await auth.$context;
    // Prove ownership for real: a bad signature is refused before the hook, so
    // the challenge is only reachable once the wallet has actually signed.
    const { address, signature } = await signChallenge(auth);
    const user = await ctx.internalAdapter.createUser({
      email: `${address}@solana.invalid`,
      emailVerified: false,
      name: "wallet",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await ctx.adapter.create({
      model: "solanaWallet",
      data: { userId: user.id, address, createdAt: new Date() },
    });
    await enrolTwoFactor(auth, user.id);

    const signIn = await post(auth, "/sign-in/solana", { address, signature });

    expect(signIn.body.twoFactorRedirect).toBe(true);
    expect(signIn.body.token).toBeUndefined();
  });

  it("leaves an account without a second factor alone", async () => {
    const signUp = await post(auth, "/sign-up/account-number");
    const signIn = await post(auth, "/sign-in/account-number", {
      accountNumber: signUp.body.accountNumber,
    });
    expect(signIn.body.twoFactorRedirect).toBeUndefined();
    expect(signIn.body.token).toEqual(expect.any(String));
  });

  it("does not gate sign-up, which has no factor to ask for", async () => {
    const signUp = await post(auth, "/sign-up/account-number");
    expect(signUp.body.twoFactorRedirect).toBeUndefined();
    expect(signUp.body.token).toEqual(expect.any(String));
  });
});

describe("the demo account", () => {
  it("signs in, and lands on the same shared user every time", async () => {
    const first = await post(auth, "/sign-in/demo");
    const second = await post(auth, "/sign-in/demo");
    expect(first.status).toBe(200);
    expect((first.body.user as { id: string }).id).toBe((second.body.user as { id: string }).id);
  });

  it("is refused anything that would let one visitor take it", async () => {
    const { setCookie } = await post(auth, "/sign-in/demo");
    const cookie = setCookie.split(";")[0] ?? "";

    const setPassword = await post(
      auth,
      "/change-password",
      {
        newPassword: "hunter2hunter2",
        currentPassword: "whatever",
      },
      { cookie },
    );

    expect(setPassword.status).toBe(403);
    expect(String(setPassword.body.message)).toMatch(/shared and read-only/);
  });

  it("leaves the session itself usable", async () => {
    const { setCookie } = await post(auth, "/sign-in/demo");
    const cookie = setCookie.split(";")[0] ?? "";
    const response = await auth.handler(
      new Request("https://auth.test/api/auth/get-session", { headers: { cookie } }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ user: { email: "demo@aussieauth.com" } });
  });
});

describe("wallet sign-in", () => {
  it("refuses a signature that doesn't match the challenge", async () => {
    const address = "So11111111111111111111111111111111111111112";
    await post(auth, "/solana/challenge", { address });
    const { status, body } = await post(auth, "/sign-in/solana", {
      address,
      signature: "3".repeat(88),
    });
    expect(status).toBe(401);
    expect(String(body.message)).toMatch(/doesn't match|expired/i);
  });

  it("refuses a signature with no challenge outstanding", async () => {
    const { status, body } = await post(auth, "/sign-in/solana", {
      address: "So11111111111111111111111111111111111111112",
      signature: "3".repeat(88),
    });
    expect(status).toBe(401);
    expect(String(body.message)).toMatch(/expired/i);
  });

  it("spends a challenge once — a replay finds nothing left", async () => {
    const { address, signature } = await signChallenge(auth);

    const first = await post(auth, "/sign-in/solana", { address, signature });
    expect(first.status).toBe(200);

    const replay = await post(auth, "/sign-in/solana", { address, signature });
    expect(replay.status).toBe(401);
    expect(String(replay.body.message)).toMatch(/expired/i);
  });
});

/**
 * A wallet that actually holds its key: asks the server for a challenge and
 * signs exactly that.
 *
 * The address has to be derived rather than picked, because a Solana address
 * *is* the ed25519 public key — a made-up one can't produce a signature that
 * verifies against itself, which is the whole basis of this sign-in.
 */
async function signChallenge(auth: Auth) {
  const { ed25519 } = await import("@noble/curves/ed25519.js");
  const bs58 = (await import("bs58")).default;

  const privateKey = new Uint8Array(32).fill(7);
  const address = bs58.encode(ed25519.getPublicKey(privateKey));

  const { body } = await post(auth, "/solana/challenge", { address });
  const signature = bs58.encode(
    ed25519.sign(new TextEncoder().encode(body.message as string), privateKey),
  );
  return { address, signature };
}
