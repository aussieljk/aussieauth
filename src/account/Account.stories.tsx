import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { mswHandlers } from "../../.storybook/msw-handlers";
import { PENDING_ACCOUNT_NUMBER } from "../lib/storage";
import { Account } from "./Account";

const meta = {
  component: Account,
  parameters: { layout: "fullscreen", msw: { handlers: mswHandlers.account } },
  tags: ["ai-generated"],
} satisfies Meta<typeof Account>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Passkeys and agent keys are plain fetches, not Convex subscriptions.
 * Passkeys arrive already named by the authenticator; keys are numbered, and
 * the create button always offers the next free number.
 */
export const Loaded: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("iCloud Keychain")).toBeVisible();
    await expect(await canvas.findByText("Key 2")).toBeVisible();
    await expect(
      await canvas.findByRole("button", { name: "Create key 3" }),
    ).toBeVisible();
  },
};

/**
 * Straight after an account-number sign-up. This is the only time the number is
 * ever shown — nothing on the server can produce it again.
 */
export const FreshAccountNumber: Story = {
  async beforeEach() {
    localStorage.setItem(PENDING_ACCOUNT_NUMBER, "1234567890123456");
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: /save your account number/i }),
    ).toBeVisible();
    // Grouped into fours for reading aloud / writing down.
    await expect(canvas.getByText("1234 5678 9012 3456")).toBeVisible();
  },
};
