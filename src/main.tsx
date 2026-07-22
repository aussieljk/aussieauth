import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "frosted-ui/styles.css";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";

// The auth screens here are mocks, so there's no Convex client to set up yet —
// App owns the <Theme> so it can drive the light/dark toggle.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
