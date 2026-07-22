import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { GoogleLogo, SolanaLogo } from "./logos";
import { BigButton } from "./ui";

const meta = {
  component: BigButton,
  args: { onClick: fn() },
  tags: ["ai-generated"],
} satisfies Meta<typeof BigButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithLogo: Story = {
  args: { children: "Continue with Google", icon: <GoogleLogo size={18} /> },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: /continue with google/i }),
    );
    await expect(args.onClick).toHaveBeenCalled();
  },
};

/** Methods without a brand mark still line up — the icon slot is fixed-width. */
export const NoLogo: Story = { args: { children: "Continue anonymously" } };

export const Wallet: Story = {
  args: { children: "Connect wallet", icon: <SolanaLogo size={18} /> },
};

export const Pending: Story = {
  args: { children: "Continue with Google", pending: true },
};
