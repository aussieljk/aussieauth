import { Feedback } from "@aussieljk/auth";

// The inline alert a panel shows after a submit — red for an error, green for
// a notice. Renders nothing when both are absent.

export const Error = () => (
  <div style={{ maxWidth: 380 }}>
    <Feedback error="That password didn't match. Try again." />
  </div>
);

export const Notice = () => (
  <div style={{ maxWidth: 380 }}>
    <Feedback notice="Link sent to you@example.com. It's good for one sign-in." />
  </div>
);
