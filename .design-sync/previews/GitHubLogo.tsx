import { GitHubLogo } from "@aussieljk/auth";

// Brand mark, sized via the `size` prop.

export const Sizes = () => (
  <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
    <GitHubLogo size={20} />
    <GitHubLogo size={32} />
    <GitHubLogo size={48} />
  </div>
);
