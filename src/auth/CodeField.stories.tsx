import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { CodeField } from "./ui";

const meta = {
  component: CodeField,
  tags: ["ai-generated"],
} satisfies Meta<typeof CodeField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText("Verification code");
    // This attribute is the whole point of the component — it's what makes
    // iOS Passwords and SMS Retriever offer the code above the keyboard.
    await expect(input).toHaveAttribute("autocomplete", "one-time-code");
    await expect(input).toHaveAttribute("inputmode", "numeric");
  },
};

export const Filled: Story = { args: { value: "123456", readOnly: true } };
