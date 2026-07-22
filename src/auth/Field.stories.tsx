import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Field } from "./ui";

const meta = {
  component: Field,
  tags: ["ai-generated"],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Email: Story = {
  args: {
    label: "Email",
    type: "email",
    placeholder: "you@example.com",
    autoComplete: "username",
  },
  play: async ({ canvas, args }) => {
    // The wrapping <label> is what associates the caption with the input.
    const input = canvas.getByLabelText(args.label);
    await expect(input).toHaveAttribute("type", "email");
  },
};

export const Password: Story = {
  args: {
    label: "Password",
    type: "password",
    autoComplete: "current-password",
  },
};

export const Prefilled: Story = {
  args: { label: "Name", value: "Lucas", readOnly: true },
};

/**
 * Proves the shared preview really loaded the app's stylesheet: without
 * Tailwind, `flex flex-col gap-1.5` on the <label> would leave it inline.
 */
export const CssCheck: Story = {
  args: { label: "Email", type: "email" },
  play: async ({ canvas, args }) => {
    const label = canvas.getByLabelText(args.label).closest("label")!;
    const style = getComputedStyle(label);
    await expect(style.display).toBe("flex");
    await expect(style.flexDirection).toBe("column");
    await expect(style.rowGap).toBe("6px"); // gap-1.5
  },
};
