import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { mswHandlers } from "../../.storybook/msw-handlers";
import { PENDING_ACCOUNT_NUMBER } from "../lib/storage";
import { AccountNumberPanel } from "./panels";

const meta = {
  component: AccountNumberPanel,
  parameters: { msw: { handlers: mswHandlers.accountNumber } },
  tags: ["ai-generated"],
} satisfies Meta<typeof AccountNumberPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

/**
 * Sign-up signs you straight in, so the number is parked in localStorage for
 * the account page to reveal once.
 */
export const Generated: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: /generate an account/i }),
    );
    await waitFor(() =>
      expect(localStorage.getItem(PENDING_ACCOUNT_NUMBER)).toBe(
        "1234567890123456",
      ),
    );
  },
};
