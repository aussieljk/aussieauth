import {
  ConvexBetterAuthProvider,
  type AuthClient,
} from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@aussieljk/frosted/styles.css";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { authClient } from "./lib/auth-client.ts";

// `expectAuth` holds queries until Better Auth has settled, so authenticated
// queries don't fire once as anonymous and then again as the real user.
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL, {
  expectAuth: true,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      {/* `AuthClient` is a loose structural union that a client with this many
          plugins never quite matches; the provider only calls useSession and
          $fetch, both of which are present. */}
      <ConvexBetterAuthProvider
        client={convex}
        authClient={authClient as unknown as AuthClient}
      >
        <App />
      </ConvexBetterAuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
