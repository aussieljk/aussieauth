import { Destructive } from "@aussieljk/auth";

// The end-of-row control that takes something away — unlink a provider, revoke
// a key, forget an account. The label lives in a tooltip; the button carries a
// danger fill.

export const Default = () => (
  <div style={{ display: "flex", gap: 12, padding: 8 }}>
    <Destructive label="Forget this account" onClick={() => {}} />
  </div>
);

export const Disabled = () => (
  <div style={{ display: "flex", gap: 12, padding: 8 }}>
    <Destructive label="Revoke key" disabled onClick={() => {}} />
  </div>
);
