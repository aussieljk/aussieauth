import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Feedback } from "./ui";

const meta = {
  component: Feedback,
  tags: ["ai-generated"],
} satisfies Meta<typeof Feedback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Error: Story = {
  args: { error: "Invalid email or password" },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText(args.error!)).toBeVisible();
  },
};

export const Notice: Story = {
  args: { notice: "Link sent to you@example.com. It's good for one sign-in." },
};

/** Both set: the error wins, since it's the thing you have to act on. */
export const ErrorWins: Story = {
  args: { error: "That code has expired", notice: "Code sent." },
};
