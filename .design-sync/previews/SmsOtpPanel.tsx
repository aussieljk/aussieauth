import { SmsOtpPanel } from "@aussieljk/auth";

// Two-step code flow. First screen collects the address; after "Send code"
// it swaps to the six-digit verification step.

export const Default = () => (
  <div style={{ maxWidth: 380 }}>
    <SmsOtpPanel />
  </div>
);
