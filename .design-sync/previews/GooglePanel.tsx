import { GooglePanel } from "@aussieljk/auth";

// A one-click social panel: the provider hint line above a full-width branded
// button. Google/GitHub/Apple differ only in which provider they name.

export const Default = () => (
  <div style={{ maxWidth: 380 }}>
    <GooglePanel />
  </div>
);
