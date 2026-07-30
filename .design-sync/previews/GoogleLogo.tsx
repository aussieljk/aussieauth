import { GoogleLogo } from "@aussieljk/auth";

// Brand marks lifted from svgl.app, sized via the `size` prop. Only methods
// with a real brand get a logo.

export const Sizes = () => (
  <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
    <GoogleLogo size={20} />
    <GoogleLogo size={32} />
    <GoogleLogo size={48} />
  </div>
);
