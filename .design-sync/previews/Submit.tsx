import { Submit } from "@aussieljk/auth";

// The panels' submit button. Shows "Working…" and disables while pending.

export const Idle = () => (
  <div style={{ maxWidth: 380 }}>
    <Submit pending={false}>Sign in</Submit>
  </div>
);

export const Pending = () => (
  <div style={{ maxWidth: 380 }}>
    <Submit pending={true}>Sign in</Submit>
  </div>
);
