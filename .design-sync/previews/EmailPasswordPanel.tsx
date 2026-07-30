import { EmailPasswordPanel } from "@aussieljk/auth";

// The email + password method panel — the labelled fields, the submit button,
// and the "create an account instead" toggle. Panels are the building blocks
// SignIn composes inline; this is one rendered on its own.

export const Default = () => (
  <div style={{ maxWidth: 380 }}>
    <EmailPasswordPanel />
  </div>
);

export const Prefilled = () => (
  <div style={{ maxWidth: 380 }}>
    <EmailPasswordPanel prefill="lucas@example.com" />
  </div>
);
