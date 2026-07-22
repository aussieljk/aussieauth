import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { Theme } from "frosted-ui";
import "frosted-ui/styles.css";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL, {
  expectAuth: true,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Theme>
        <ConvexAuthProvider client={convex}>
          <App />
        </ConvexAuthProvider>
      </Theme>
    </ErrorBoundary>
  </StrictMode>,
);
