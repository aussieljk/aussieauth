import { AussieAuthClientProvider, createAussieAuthClient, GooglePanel } from "@aussieljk/auth";

// The context provider that makes one client the one every AussieAuth
// component below it uses. It renders nothing of its own — shown here wrapping
// a panel that reads its client from the provider.

const client = createAussieAuthClient({ baseURL: "https://demo.aussieauth.com" });

export const WrappingAPanel = () => (
  <div style={{ maxWidth: 380 }}>
    <AussieAuthClientProvider client={client}>
      <GooglePanel />
    </AussieAuthClientProvider>
  </div>
);
