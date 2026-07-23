import { expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { PENDING_ACCOUNT_NUMBER } from "@/lib/storage";
import { renderFixture } from "@/testing/render";
import fixtures from "./panels.fixture";

test("rejected credentials surface as feedback", async () => {
  const screen = await renderFixture(fixtures["Email + password / rejected"]);
  await userEvent.fill(screen.getByLabelText("Email"), "lucas@example.com");
  await userEvent.fill(screen.getByLabelText("Password"), "hunter2");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await expect.element(screen.getByText("Invalid email or password")).toBeVisible();
});

/** Toggling to sign-up adds the name field and swaps the submit verb. */
test("switching to sign-up asks for a name", async () => {
  const screen = await renderFixture(fixtures["Email + password"]);
  await userEvent.click(screen.getByRole("button", { name: /create an account instead/i }));
  await expect.element(screen.getByLabelText("Name")).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "Create account" })).toBeVisible();
});

/** Nothing navigates — the panel just confirms the link is out. */
test("the magic link panel confirms the send", async () => {
  const screen = await renderFixture(fixtures["Magic link"]);
  await userEvent.fill(screen.getByLabelText("Email"), "lucas@example.com");
  await userEvent.click(screen.getByRole("button", { name: /email me a link/i }));
  await expect.element(screen.getByText(/link sent to lucas@example\.com/i)).toBeVisible();
});

/** The second step only appears once the send actually succeeded. */
test("the email OTP panel only asks for a code after sending one", async () => {
  const screen = await renderFixture(fixtures["Email OTP"]);
  await userEvent.fill(screen.getByLabelText("Email"), "lucas@example.com");
  await userEvent.click(screen.getByRole("button", { name: /send code/i }));
  await expect.element(screen.getByLabelText("Verification code")).toBeVisible();
  await expect.element(screen.getByText("Code sent to lucas@example.com.")).toBeVisible();
});

test("a generated account number is parked for the account page", async () => {
  const screen = await renderFixture(fixtures["Account number"]);
  await userEvent.click(screen.getByRole("button", { name: /generate an account/i }));
  await expect.poll(() => localStorage.getItem(PENDING_ACCOUNT_NUMBER)).toBe("1234567890123456");
});
