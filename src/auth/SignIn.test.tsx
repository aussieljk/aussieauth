import { expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { renderFixture } from "@/testing/render";
import fixture from "./SignIn.fixture";

/** Picking from "more ways to sign in" swaps the card body for that panel. */
test("picking a method opens its panel", async () => {
  const screen = await renderFixture(fixture);
  await userEvent.click(screen.getByRole("button", { name: "Passkey" }));
  await expect.element(screen.getByRole("heading", { name: "Passkey" })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: /use a passkey/i })).toBeVisible();
});

/** …and the back link returns you to the full list. */
test("the back link returns to the full list", async () => {
  const screen = await renderFixture(fixture);
  await userEvent.click(screen.getByRole("button", { name: "Magic Link" }));
  await userEvent.click(screen.getByRole("button", { name: /all sign-in options/i }));
  const welcome = screen.getByRole("heading", { name: /welcome to aussieauth/i });
  await expect.element(welcome).toBeVisible();
});
