import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { mswHandlers } from "../../.storybook/msw-handlers";
import { MagicLinkPanel } from "./panels";

const meta = {
  component: MagicLinkPanel,
  parameters: { msw: { handlers: mswHandlers.magicLink } },
  tags: ["ai-generated"],
} satisfies Meta<typeof MagicLinkPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

/** Nothing navigates — the panel just confirms the link is out. */
export const LinkSent: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText("Email"), "lucas@example.com");
    await userEvent.click(
      canvas.getByRole("button", { name: /email me a link/i }),
    );
    await expect(
      await canvas.findByText(/link sent to lucas@example\.com/i),
    ).toBeVisible();
  },
};
