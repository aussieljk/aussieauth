import { AppleLogo } from "@aussieljk/auth";

// Brand mark, sized via the `size` prop.

export const Sizes = () => (
  <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
    <AppleLogo size={20} />
    <AppleLogo size={32} />
    <AppleLogo size={48} />
  </div>
);
