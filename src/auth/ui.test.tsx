import { expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { renderFixture } from "@/testing/render";
import fixtures from "./ui.fixture";
import { BigButton } from "./ui";

test("a field's caption labels its input", async () => {
  const screen = await renderFixture(fixtures["Field / email"]);
  // The wrapping <label> is what associates the caption with the input.
  await expect.element(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
});

/**
 * Proves the shared decorator really loaded the app's stylesheet: without
 * Tailwind, `flex flex-col gap-1.5` on the <label> would leave it inline.
 */
test("a field is laid out by the app's own stylesheet", async () => {
  const screen = await renderFixture(fixtures["Field / email"]);
  const style = getComputedStyle(screen.getByLabelText("Email").element().closest("label")!);
  expect(style.display).toBe("flex");
  expect(style.flexDirection).toBe("column");
  expect(style.rowGap).toBe("6px"); // gap-1.5
});

test("the code field asks for the one-time-code keyboard", async () => {
  const screen = await renderFixture(fixtures["Code field / empty"]);
  const code = screen.getByLabelText("Verification code");
  // These attributes are the whole point of the component — they're what make
  // iOS Passwords and SMS Retriever offer the code above the keyboard.
  await expect.element(code).toHaveAttribute("autocomplete", "one-time-code");
  await expect.element(code).toHaveAttribute("inputmode", "numeric");
});

test("feedback shows the error it's given", async () => {
  const screen = await renderFixture(fixtures["Feedback / error"]);
  await expect.element(screen.getByText("Invalid email or password")).toBeVisible();
});

test("a big button reports its click", async () => {
  const onClick = vi.fn();
  const screen = await renderFixture(<BigButton onClick={onClick}>Continue with Google</BigButton>);
  await userEvent.click(screen.getByRole("button", { name: /continue with google/i }));
  expect(onClick).toHaveBeenCalled();
});
