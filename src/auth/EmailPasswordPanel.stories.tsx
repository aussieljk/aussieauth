import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { mswHandlers } from "../../.storybook/msw-handlers";
import { EmailPasswordPanel } from "./panels";

const meta = {
  component: EmailPasswordPanel,
  tags: ["ai-generated"],
} satisfies Meta<typeof EmailPasswordPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignIn: Story = {};

/** The failure path every panel shares: Better Auth resolves, `Feedback` shows. */
export const RejectedCredentials: Story = {
  parameters: { msw: { handlers: mswHandlers.signInFailure } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText("Email"), "lucas@example.com");
    await userEvent.type(canvas.getByLabelText("Password"), "hunter2");
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await expect(
      await canvas.findByText("Invalid email or password"),
    ).toBeVisible();
  },
};

/** Toggling to sign-up adds the name field and swaps the submit verb. */
export const CreateAccount: Story = {
  parameters: { msw: { handlers: mswHandlers.signInSuccess } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: /create an account instead/i }),
    );
    await expect(await canvas.findByLabelText("Name")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Create account" }),
    ).toBeVisible();
  },
};
