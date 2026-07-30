import { AgentLogo } from "@aussieljk/auth";

// Brand mark, sized via the `size` prop.

export const Sizes = () => (
  <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
    <AgentLogo size={20} />
    <AgentLogo size={32} />
    <AgentLogo size={48} />
  </div>
);
