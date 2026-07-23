import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { REMEMBERED_ACCOUNTS } from "@/lib/storage";
import { RememberedAccounts } from "./RememberedAccounts";

const meta = {
  component: RememberedAccounts,
  args: { onNeedsPanel: fn() },
  tags: ["ai-generated"],
} satisfies Meta<typeof RememberedAccounts>;

export default meta;
type Story = StoryObj<typeof meta>;

const seed = (accounts: unknown[]) =>
  localStorage.setItem(REMEMBERED_ACCOUNTS, JSON.stringify(accounts));

/** Nothing to offer on a browser that's never signed in — the list stays out
 * of the card entirely rather than reserving an empty row. */
export const NeverSignedIn: Story = {
  async beforeEach() {
    localStorage.removeItem(REMEMBERED_ACCOUNTS);
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};

/**
 * The usual case: a real address shows the address, and an account with only
 * an invented one (anonymous, account number) falls back to naming its method.
 */
export const TwoAccounts: Story = {
  async beforeEach() {
    seed([
      {
        id: "user_1",
        name: "Lucas Knight",
        email: "lucas@example.com",
        method: "google",
        cookie: "{}",
        savedAt: 2,
      },
      {
        id: "user_2",
        name: "Anonymous",
        email: "abc@anonymous.invalid",
        method: "anonymous",
        savedAt: 1,
      },
    ]);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Lucas Knight")).toBeVisible();
    await expect(await canvas.findByText("lucas@example.com")).toBeVisible();
    // No usable email, so the method is the more informative subtitle.
    await expect(await canvas.findByText("via Anonymous")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: /forget lucas knight/i }),
    ).toBeVisible();
  },
};

/**
 * An entry whose stored session has already been rejected keeps no cookie, so
 * clicking it hands the caller a panel to finish in rather than failing.
 */
export const SessionExpired: Story = {
  async beforeEach() {
    seed([
      {
        id: "user_1",
        name: "Lucas Knight",
        email: "lucas@example.com",
        method: "email-password",
        savedAt: 1,
      },
    ]);
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(await canvas.findByText("Lucas Knight"));
    await expect(args.onNeedsPanel).toHaveBeenCalledWith(
      "email-password",
      "lucas@example.com",
    );
  },
};
