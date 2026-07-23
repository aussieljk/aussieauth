import type { ComponentType } from "react";
import {
  AgentLogo,
  AppleLogo,
  GitHubLogo,
  GoogleLogo,
  GoogleOneTapLogo,
  SolanaLogo,
} from "./logos";

/**
 * The display half of every sign-in method. The behaviour half lives in
 * `panels.tsx`, keyed by the same id — adding a method means a row here and an
 * entry there.
 */
export type Provider = {
  id: string;
  label: string;
  /** One line of explanation, shown at the top of the method's panel. */
  hint: string;
  /**
   * Only set for methods with a real brand mark. Everything else renders as a
   * plain label rather than an invented icon.
   */
  Logo?: ComponentType<{ size?: number; className?: string }>;
  /** Verb for the primary button; defaults to "Continue with <label>". */
  cta?: string;
};

export const PROVIDERS: Provider[] = [
  {
    id: "google",
    label: "Google",
    hint: "OAuth via your Google account",
    Logo: GoogleLogo,
  },
  {
    id: "google-one-tap",
    label: "Google One Tap",
    hint: "Silent sign-in from an existing Google session",
    Logo: GoogleOneTapLogo,
    cta: "One Tap sign-in",
  },
  {
    id: "github",
    label: "GitHub",
    hint: "OAuth via your GitHub account",
    Logo: GitHubLogo,
  },
  {
    id: "apple",
    label: "Apple",
    hint: "Sign in with Apple, with Hide My Email",
    Logo: AppleLogo,
  },
  {
    id: "solana",
    label: "Solana Wallet",
    hint: "Sign a message with Phantom, Solflare or Backpack",
    Logo: SolanaLogo,
    cta: "Connect wallet",
  },
  {
    id: "passkey",
    label: "Passkey",
    hint: "Face ID, Touch ID or a security key",
    cta: "Use a passkey",
  },
  {
    id: "email-password",
    label: "Email & Password",
    hint: "The classic credential pair",
  },
  {
    id: "phone-password",
    label: "Phone & Password",
    hint: "Mobile number instead of an email address",
  },
  {
    id: "username-password",
    label: "Username & Password",
    hint: "No email on file at all",
  },
  {
    id: "magic-link",
    label: "Magic Link",
    hint: "We email you a one-click sign-in link",
    cta: "Email me a link",
  },
  {
    id: "email-otp",
    label: "Email OTP",
    hint: "Six digits sent to your inbox",
    cta: "Send code",
  },
  {
    id: "ios-otp",
    label: "SMS Code",
    hint: "Six digits by text, autofilled by iOS Passwords",
    cta: "Text me a code",
  },
  {
    id: "demo",
    label: "Demo Account",
    hint: "One shared sandbox account, no sign-up",
    cta: "Try the demo",
  },
  {
    id: "anonymous",
    label: "Anonymous",
    hint: "A throwaway session you can upgrade later",
    cta: "Continue anonymously",
  },
  {
    id: "account-number",
    label: "Account Number",
    hint: "Mullvad-style — we generate a number, you keep it",
    cta: "Generate an account",
  },
  {
    id: "agent",
    label: "Agent Auth",
    hint: "Long-lived API key for an autonomous agent",
    Logo: AgentLogo,
    cta: "Authorise agent",
  },
];

export const tryById = (id: string | null | undefined): Provider | undefined =>
  PROVIDERS.find((p) => p.id === id);

export const byId = (id: string): Provider => tryById(id) ?? PROVIDERS[0];

/** The button label a panel should use for a given method. */
export const ctaFor = (p: Provider): string => p.cta ?? `Continue with ${p.label}`;
