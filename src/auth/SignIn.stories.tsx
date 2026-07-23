import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { SignIn } from "./SignIn";

const meta = {
  component: SignIn,
  parameters: { layout: "fullscreen" },
  tags: ["ai-generated"],
} satisfies Meta<typeof SignIn>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * There's no handler for `/aussieauth/status` here, so the setup probe fails
 * and the card renders its unknown-status state: every method offered, no
 * setup warnings. Same thing a real deployment shows before the probe lands.
 */
export const Card: Story = {};

/** Picking from "more ways to sign in" swaps the card body for that panel. */
export const PasskeyPanel: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Passkey" }));
    await expect(
      await canvas.findByRole("heading", { name: "Passkey" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: /use a passkey/i }),
    ).toBeVisible();
  },
};

/** …and the back link returns you to the full list. */
export const BackFromPanel: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Magic Link" }));
    await userEvent.click(
      canvas.getByRole("button", { name: /all sign-in options/i }),
    );
    await expect(
      await canvas.findByRole("heading", { name: /welcome to aussieauth/i }),
    ).toBeVisible();
  },
};
