import { RouteLoading } from "@aussieljk/auth";

// Fills the viewport with a centred spinner while a gated route waits on auth
// to settle (e.g. the beat after an OAuth return). `min-h-screen` in the app;
// shown in a fixed-height box here.

export const Default = () => (
  <div style={{ height: 220, width: 380 }}>
    <RouteLoading />
  </div>
);
