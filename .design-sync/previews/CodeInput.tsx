import { CodeInput } from "@aussieljk/auth";

// The bare six-digit code input (no label). `autoComplete="one-time-code"`
// lets iOS Passwords / Android SMS Retriever surface the code above the
// keyboard.

export const Empty = () => (
  <div style={{ maxWidth: 200 }}>
    <CodeInput defaultValue="" />
  </div>
);

export const Filled = () => (
  <div style={{ maxWidth: 200 }}>
    <CodeInput defaultValue="123456" />
  </div>
);
