import { expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { MockApi } from "@/testing/MockApi";
import { renderFixture } from "@/testing/render";
import fixtures, { sessionExpired } from "./RememberedAccounts.fixture";
import { RememberedAccounts } from "./RememberedAccounts";

test("a browser that's never signed in offers nothing", async () => {
  const screen = await renderFixture(fixtures["Never signed in"]);
  await expect.element(screen.getByRole("button")).not.toBeInTheDocument();
});

test("an account without a usable email is named by its method", async () => {
  const screen = await renderFixture(fixtures["Two accounts"]);
  await expect.element(screen.getByText("Lucas Knight")).toBeVisible();
  await expect.element(screen.getByText("lucas@example.com")).toBeVisible();
  // No usable email, so the method is the more informative subtitle.
  await expect.element(screen.getByText("via Anonymous")).toBeVisible();
  const forget = screen.getByRole("button", { name: /forget lucas knight/i });
  await expect.element(forget).toBeVisible();
});

test("an expired session falls back to a panel", async () => {
  const onNeedsPanel = vi.fn();
  const screen = await renderFixture(
    <MockApi storage={sessionExpired}>
      <RememberedAccounts onNeedsPanel={onNeedsPanel} />
    </MockApi>,
  );
  await userEvent.click(screen.getByText("Lucas Knight"));
  const call = ["email-password", "lucas@example.com"];
  await expect.poll(() => onNeedsPanel.mock.calls).toContainEqual(call);
});
