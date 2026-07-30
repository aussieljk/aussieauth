import { SolanaLogo } from "@aussieljk/auth";

// Brand mark, sized via the `size` prop.

export const Sizes = () => (
  <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
    <SolanaLogo size={20} />
    <SolanaLogo size={32} />
    <SolanaLogo size={48} />
  </div>
);
