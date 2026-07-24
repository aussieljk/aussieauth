import type { ComponentType } from "react";
import {
  AccountNumberPanel,
  AgentPanel,
  AnonymousPanel,
  ApplePanel,
  DemoPanel,
  EmailOtpPanel,
  EmailPasswordPanel,
  GitHubPanel,
  GooglePanel,
  MagicLinkPanel,
  type PanelProps,
  PasskeyPanel,
  PhonePasswordPanel,
  SmsOtpPanel,
  SolanaPanel,
  UsernamePasswordPanel,
} from "./panels";

/** Provider id → the panel that drives it. Mirrors `PROVIDERS` in providers.ts. */
export const PANELS: Record<string, ComponentType<PanelProps>> = {
  google: GooglePanel,
  // "google-one-tap" retired from the card — see auth/oneTap.disabled.tsx.
  github: GitHubPanel,
  apple: ApplePanel,
  solana: SolanaPanel,
  passkey: PasskeyPanel,
  "email-password": EmailPasswordPanel,
  "phone-password": PhonePasswordPanel,
  "username-password": UsernamePasswordPanel,
  "magic-link": MagicLinkPanel,
  "email-otp": EmailOtpPanel,
  "ios-otp": SmsOtpPanel,
  demo: DemoPanel,
  anonymous: AnonymousPanel,
  "account-number": AccountNumberPanel,
  agent: AgentPanel,
};
