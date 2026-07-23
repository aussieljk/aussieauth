import { expect, test } from "vitest";
import { renderFixture } from "@/testing/render";
import fixtures from "./Account.fixture";

test("passkeys and agent keys arrive from plain fetches", async () => {
  const screen = await renderFixture(fixtures.Loaded);
  await expect.element(screen.getByText("iCloud Keychain")).toBeVisible();
  await expect.element(screen.getByText("Key 2")).toBeVisible();
  // Keys are numbered, so the create button offers the next free number.
  await expect.element(screen.getByRole("button", { name: "Create key 3" })).toBeVisible();
});

test("a fresh account number is shown once, grouped for writing down", async () => {
  const screen = await renderFixture(fixtures["Fresh account number"]);
  const heading = screen.getByRole("heading", { name: /save your account number/i });
  await expect.element(heading).toBeVisible();
  await expect.element(screen.getByText("1234 5678 9012 3456")).toBeVisible();
});
