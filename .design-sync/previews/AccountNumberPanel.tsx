import { AccountNumberPanel } from "@aussieljk/auth";

// Mullvad-style: the account number is the whole account — no email, no
// password. Sign in with an existing number, or generate a fresh one.

export const Default = () => (
  <div style={{ maxWidth: 380 }}>
    <AccountNumberPanel />
  </div>
);
