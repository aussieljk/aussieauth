import { Theme } from "ljkui";
import type { ComponentProps } from "react";
// The frosted design tokens the card is built on, and the package's own
// compiled utilities. Side-effect-imported here so a consumer drops in
// <AussieAuthSignIn> and gets a styled card without wiring any CSS.
import "ljkui/styles.css";
import "./styles.css";
import { SignIn, type SignInProps } from "./SignIn";

/** The subset of `<Theme>` props worth exposing for basic branding. */
type ThemePassthrough = Pick<
  ComponentProps<typeof Theme>,
  "appearance" | "accentColor" | "grayColor"
>;

export type AussieAuthSignInProps = SignInProps & ThemePassthrough;

/**
 * The drop-in sign-in card. Wraps {@link SignIn} in its own `ljkui`
 * `<Theme>`, so it themes off `accentColor`/`grayColor`/`appearance` props
 * regardless of what the host app is (or isn't) using. For full control over
 * the theme or layout, import `SignIn` directly instead.
 */
export function AussieAuthSignIn({
  appearance,
  accentColor,
  grayColor,
  ...signIn
}: AussieAuthSignInProps) {
  return (
    <Theme appearance={appearance} accentColor={accentColor} grayColor={grayColor}>
      <SignIn {...signIn} />
    </Theme>
  );
}
