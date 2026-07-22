import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { mswHandlers } from "../../.storybook/msw-handlers";
import { EmailOtpPanel } from "./panels";

const meta = {
  component: EmailOtpPanel,
  parameters: { msw: { handlers: mswHandlers.emailOtp } },
  tags: ["ai-generated"],
} satisfies Meta<typeof EmailOtpPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AskForEmail: Story = {};

/** The second step only appears once the send actually succeeded. */
export const CodeStep: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText("Email"), "lucas@example.com");
    await userEvent.click(canvas.getByRole("button", { name: /send code/i }));

    await expect(
      await canvas.findByLabelText("Verification code"),
    ).toBeVisible();
    await expect(
      canvas.getByText("Code sent to lucas@example.com."),
    ).toBeVisible();
  },
};
