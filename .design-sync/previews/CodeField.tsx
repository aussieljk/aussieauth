import { CodeField } from "@aussieljk/auth";

// A labelled six-digit verification-code input (OTP / 2FA flows).

export const Empty = () => (
  <div style={{ maxWidth: 340 }}>
    <CodeField defaultValue="" />
  </div>
);

export const Filled = () => (
  <div style={{ maxWidth: 340 }}>
    <CodeField defaultValue="123456" />
  </div>
);
