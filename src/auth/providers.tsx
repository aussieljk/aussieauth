import type { ComponentType } from "react";
import {
  AccountNumberLogo,
  AgentLogo,
  AnonymousLogo,
  AppleLogo,
  DemoLogo,
  EmailOtpLogo,
  GitHubLogo,
  GoogleLogo,
  GoogleOneTapLogo,
  IosPasswordsLogo,
  MagicLinkLogo,
  MailLogo,
  PasskeyLogo,
  PhoneLogo,
  SolanaLogo,
  UsernameLogo,
} from "./logos";

export type ProviderCategory =
  | "social"
  | "wallet"
  | "password"
  | "passwordless"
  | "instant"
  | "machine";

/**
 * How the method collects input. Variants switch on this to decide which mock
 * form to draw, so a new provider only needs a row here — no variant edits.
 */
export type ProviderForm =
  | "none" // one click, nothing to type
  | "email-password"
  | "phone-password"
  | "username-password"
  | "email-only"
  | "otp"
  | "token";

export type Provider = {
  id: string;
  /** Full name, used in headings and wide layouts. */
  label: string;
  /** Compact name for tiles and chips where space is tight. */
  short: string;
  /** One line of explanation shown under the label. */
  hint: string;
  category: ProviderCategory;
  form: ProviderForm;
  Logo: ComponentType<{ size?: number; className?: string }>;
  /** frosted-ui accent used when a variant tints this method. */
  accent: "blue" | "gray" | "iris" | "jade" | "purple" | "amber" | "orange";
  /** Verb for the primary button, e.g. "Continue with Google". */
  cta?: string;
};

export const PROVIDERS: Provider[] = [
  {
    id: "google",
    label: "Google",
    short: "Google",
    hint: "OAuth via your Google account",
    category: "social",
    form: "none",
    Logo: GoogleLogo,
    accent: "blue",
  },
  {
    id: "google-one-tap",
    label: "Google One Tap",
    short: "One Tap",
    hint: "Silent sign-in from an existing Google session",
    category: "social",
    form: "none",
    Logo: GoogleOneTapLogo,
    accent: "blue",
    cta: "One Tap sign-in",
  },
  {
    id: "github",
    label: "GitHub",
    short: "GitHub",
    hint: "OAuth via your GitHub account",
    category: "social",
    form: "none",
    Logo: GitHubLogo,
    accent: "gray",
  },
  {
    id: "apple",
    label: "Apple",
    short: "Apple",
    hint: "Sign in with Apple, with Hide My Email",
    category: "social",
    form: "none",
    Logo: AppleLogo,
    accent: "gray",
  },
  {
    id: "solana",
    label: "Solana Wallet",
    short: "Solana",
    hint: "Sign a message with Phantom, Solflare or Backpack",
    category: "wallet",
    form: "none",
    Logo: SolanaLogo,
    accent: "purple",
    cta: "Connect wallet",
  },
  {
    id: "passkey",
    label: "Passkey",
    short: "Passkey",
    hint: "Face ID, Touch ID or a security key",
    category: "passwordless",
    form: "none",
    Logo: PasskeyLogo,
    accent: "iris",
    cta: "Use a passkey",
  },
  {
    id: "email-password",
    label: "Email & Password",
    short: "Email",
    hint: "The classic credential pair",
    category: "password",
    form: "email-password",
    Logo: MailLogo,
    accent: "blue",
  },
  {
    id: "phone-password",
    label: "Phone & Password",
    short: "Phone",
    hint: "Mobile number instead of an email address",
    category: "password",
    form: "phone-password",
    Logo: PhoneLogo,
    accent: "jade",
  },
  {
    id: "username-password",
    label: "Username & Password",
    short: "Username",
    hint: "No email on file at all",
    category: "password",
    form: "username-password",
    Logo: UsernameLogo,
    accent: "amber",
  },
  {
    id: "magic-link",
    label: "Magic Link",
    short: "Magic Link",
    hint: "We email you a one-click sign-in link",
    category: "passwordless",
    form: "email-only",
    Logo: MagicLinkLogo,
    accent: "iris",
    cta: "Email me a link",
  },
  {
    id: "email-otp",
    label: "Email OTP",
    short: "Email OTP",
    hint: "Six digits sent to your inbox",
    category: "passwordless",
    form: "otp",
    Logo: EmailOtpLogo,
    accent: "iris",
    cta: "Send code",
  },
  {
    id: "ios-otp",
    label: "iOS Passwords OTP",
    short: "iOS Codes",
    hint: "Autofilled from the iOS Passwords app",
    category: "passwordless",
    form: "otp",
    Logo: IosPasswordsLogo,
    accent: "gray",
    cta: "Autofill code",
  },
  {
    id: "demo",
    label: "Demo Account",
    short: "Demo",
    hint: "Prefilled sandbox data, resets nightly",
    category: "instant",
    form: "none",
    Logo: DemoLogo,
    accent: "jade",
    cta: "Try the demo",
  },
  {
    id: "anonymous",
    label: "Anonymous",
    short: "Anonymous",
    hint: "A throwaway session you can upgrade later",
    category: "instant",
    form: "none",
    Logo: AnonymousLogo,
    accent: "gray",
    cta: "Continue anonymously",
  },
  {
    id: "account-number",
    label: "Account Number",
    short: "Account No.",
    hint: "Mullvad-style — we generate a number, you keep it",
    category: "instant",
    form: "token",
    Logo: AccountNumberLogo,
    accent: "orange",
    cta: "Generate an account",
  },
  {
    id: "agent",
    label: "Agent Auth",
    short: "Agent",
    hint: "Delegated token for an autonomous agent",
    category: "machine",
    form: "token",
    Logo: AgentLogo,
    accent: "orange",
    cta: "Authorise agent",
  },
];

export const CATEGORY_LABEL: Record<ProviderCategory, string> = {
  social: "Social",
  wallet: "Wallet",
  password: "Password",
  passwordless: "Passwordless",
  instant: "Instant",
  machine: "Machine",
};

/** Display order for anything that groups by category. */
export const CATEGORY_ORDER: ProviderCategory[] = [
  "social",
  "passwordless",
  "password",
  "wallet",
  "instant",
  "machine",
];

export const byId = (id: string): Provider =>
  PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];

export const byCategory = (category: ProviderCategory): Provider[] =>
  PROVIDERS.filter((p) => p.category === category);

/** The button label a variant should use for a given method. */
export const ctaFor = (p: Provider): string =>
  p.cta ?? `Continue with ${p.label}`;
