import { UsernamePasswordPanel } from "@aussieljk/auth";

export const Default = () => (
  <div style={{ maxWidth: 380 }}>
    <UsernamePasswordPanel />
  </div>
);

export const Prefilled = () => (
  <div style={{ maxWidth: 380 }}>
    <UsernamePasswordPanel prefill="lucas" />
  </div>
);
