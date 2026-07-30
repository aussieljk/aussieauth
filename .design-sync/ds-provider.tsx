// Preview provider for design-sync cards.
//
// The panels/cards read their auth client through context (or the module-level
// fallback), and `useAuthClient()` THROWS at render if no client was ever
// configured. So we build one demo client at module load — it points at a
// stand-in origin and never actually talks to a server in a static preview
// (methods only fire on click). We also inject ljkui's <Theme>, which is what
// defines the --fui-ca-* accent scale the components style off.
import type { ReactNode } from "react";
import { Theme } from "ljkui";
// Registers the lucide icon adapter globally so ljkui <Icons.*> (the trash /
// close marks in Destructive and RememberedAccounts) actually render — the DS
// package leaves adapter registration to the host app.
import "ljkui/icons/lucide";
import { AussieAuthClientProvider, createAussieAuthClient } from "@aussieljk/auth";

const client = createAussieAuthClient({ baseURL: "https://demo.aussieauth.com" });

export function PreviewProvider({ children }: { children: ReactNode }) {
  return (
    <Theme appearance="light">
      <AussieAuthClientProvider client={client}>{children}</AussieAuthClientProvider>
    </Theme>
  );
}

// Also exposed on the global so a preview can wrap a fragment itself if needed.
export { Theme };
