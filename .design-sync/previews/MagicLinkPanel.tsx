import { MagicLinkPanel } from "@aussieljk/auth";

export const Default = () => (
  <div style={{ maxWidth: 380 }}>
    <MagicLinkPanel />
  </div>
);

export const Prefilled = () => (
  <div style={{ maxWidth: 380 }}>
    <MagicLinkPanel prefill="lucas@example.com" />
  </div>
);
