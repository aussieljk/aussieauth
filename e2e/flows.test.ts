import { createHmac, randomBytes } from "node:crypto";
import { type Browser, type Page, chromium } from "playwright";
import { afterAll, beforeAll, expect, test } from "vitest";

/**
 * The flows the component tests can't touch: a real browser against the real
 * site and the real dev deployment, cookies and plugin ordering included.
 *
 * Run it with the site up:
 *
 *   bun dev                # or: bunx vite --port 5173, with E2E_BASE_URL set
 *   bun run test:e2e
 *
 * It signs up a throwaway account, walks it through TOTP enrolment and the
 * challenge, and deletes it at the end — so the deployment is left as found.
 */

const BASE = process.env.E2E_BASE_URL ?? "https://aussieauth.localhost";

/** RFC 6238, enough of it for the six-digit default the server issues. */
const totp = (secret: string, at = Date.now()) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.replace(/=+$/, "").toUpperCase()) {
    bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  }
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  const offset = digest[digest.length - 1]! & 0xf;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
};

const email = `e2e-${randomBytes(4).toString("hex")}@example.invalid`;
const password = `pw-${randomBytes(8).toString("hex")}`;

let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await chromium.launch();
  // The portless dev cert is self-signed; a real visitor's browser trusts it,
  // this one doesn't need to.
  page = await (await browser.newContext({ ignoreHTTPSErrors: true })).newPage();
});

afterAll(async () => {
  await browser.close();
});

test("sign up, enrol TOTP, pass the challenge, delete the account", async () => {
  // Sign up with email + password.
  await page.goto(`${BASE}/sign-in`);
  await page.getByRole("button", { name: "Create an account instead" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/account");

  // Enrol TOTP from the account page.
  await page.getByRole("button", { name: "Enable" }).click();
  await page.getByLabel("Your password").fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  const secret = (await page
    .locator("code", { hasText: /^[A-Z2-7]{16,}$/ })
    .first()
    .textContent())!;
  await page.getByLabel("Authenticator code").fill(totp(secret));
  await page.getByRole("button", { name: "Confirm" }).click();
  // Verifying rotates the session, so the whole account page remounts through
  // its auth-settling spinner — wait for the durable state, not the notice:
  // an enabled row is the only place "New codes" exists.
  await expect
    .poll(() => page.getByRole("button", { name: "New codes" }).isVisible(), { timeout: 45_000 })
    .toBe(true);

  // Sign out locally, then sign back in with the password — the card must
  // now interpose the TOTP challenge before a session appears.
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForURL("**/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect
    .poll(() => page.getByText(/six-digit code/).isVisible(), { timeout: 15_000 })
    .toBe(true);

  // The enrolment code may still be inside the same 30-second window, and the
  // server refuses a replay — wait for the next window before answering.
  const window = 30_000;
  const untilNext = window - (Date.now() % window);
  await new Promise((resolve) => setTimeout(resolve, untilNext + 500));
  await page.getByLabel("Verification code").fill(totp(secret));
  await page.getByRole("button", { name: "Verify and sign in" }).click();
  await page.waitForURL("**/account");

  // Leave nothing behind.
  await page.getByRole("button", { name: "Delete account" }).click();
  await page.getByLabel("Your password").fill(password);
  await page.getByRole("button", { name: "Delete forever" }).click();
  await page.waitForURL(`${BASE}/`);
});
