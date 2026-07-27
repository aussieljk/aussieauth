import { expect, test } from "vitest";
import { renderFixture } from "@/testing/render";
import fixtures from "./SignInCard.fixture";

test("a wrong password surfaces the server's error", async () => {
  const screen = await renderFixture(fixtures["Wrong password"]);
  await screen.getByLabelText("Email").fill("lucas@example.com");
  await screen.getByLabelText("Password").fill("not-it");
  await screen.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect.element(screen.getByText("Invalid email or password")).toBeVisible();
});

test("a two-factor account gets the challenge step, then signs in", async () => {
  const screen = await renderFixture(fixtures["Two-factor challenge"]);
  await screen.getByLabelText("Email").fill("lucas@example.com");
  await screen.getByLabelText("Password").fill("correct");
  await screen.getByRole("button", { name: "Sign in", exact: true }).click();

  // The password was accepted; the card swaps to the TOTP challenge.
  await expect.element(screen.getByText(/six-digit code/)).toBeVisible();
  await expect.element(screen.getByText(/ask again on this device/)).toBeVisible();

  // The backup-code fallback is one click away, and one click back.
  await screen.getByRole("button", { name: "Use a backup code" }).click();
  await expect.element(screen.getByText(/backup codes/i)).toBeVisible();
  await screen.getByRole("button", { name: "Use my authenticator instead" }).click();

  await screen.getByLabelText("Verification code").fill("123456");
  await screen.getByRole("button", { name: "Verify and sign in" }).click();
  // The mocked verify answers with a session and no error alert appears.
  await expect.element(screen.getByText(/six-digit code/)).toBeVisible();
});

test("a remembered credential account opens its panel prefilled", async () => {
  const screen = await renderFixture(fixtures["Remembered account"]);
  await screen.getByRole("button", { name: /lucas@example\.com/ }).click();
  // No stored session and nothing to replay silently — the email panel opens
  // with the address already in place.
  await expect.element(screen.getByRole("heading", { name: "Email & Password" })).toBeVisible();
  await expect.element(screen.getByLabelText("Email")).toHaveValue("lucas@example.com");
});
