import { expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { REMEMBERED_ACCOUNTS } from "@/lib/storage";
import { MockApi } from "@/testing/MockApi";
import { renderFixture } from "@/testing/render";
import fixtures, { sessionExpired } from "./RememberedAccounts.fixture";
import { RememberedAccounts } from "./RememberedAccounts";

/** Whether the stored jar for the first account survived, per localStorage. */
const storedCookie = () => {
  const [first] = JSON.parse(localStorage.getItem(REMEMBERED_ACCOUNTS) ?? "[]") as {
    cookie?: string;
  }[];
  return first?.cookie;
};

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

test("a session the server rejects is dropped by the probe on mount", async () => {
  const screen = await renderFixture(fixtures["Session revoked"]);
  await expect.element(screen.getByText("Lucas Knight")).toBeVisible();
  await expect.poll(storedCookie).toBeUndefined();
});

test("a probe that can't reach the server keeps the stored session", async () => {
  // No handlers, so the request leaves and fails the way it would offline. A
  // failed probe must not be read as "the session is gone" — doing so would
  // sign someone out over a dropped packet.
  const screen = await renderFixture(fixtures["Two accounts"]);
  await expect.element(screen.getByText("Lucas Knight")).toBeVisible();
  await expect.poll(storedCookie).toBe("{}");
});
