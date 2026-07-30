import { Theme } from "ljkui";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
// Resolves `Icons.Trash` and friends the way `main.tsx` does for the app.
import "ljkui/icons/lucide";

/**
 * Everything the app mounts above a screen. Fixtures never reach a real
 * deployment, so `useQuery` stays `undefined` — the same pre-settle state the
 * app renders before Convex answers.
 */
const convex = new ConvexReactClient("http://127.0.0.1:9");

export default function CosmosDecorator({ children }: { children: ReactNode }) {
  return (
    // The theme `App` mounts, so Frosted tokens like `--gray-11` resolve.
    <Theme appearance="dark" accentColor="green" grayColor="neutral">
      <ConvexProvider client={convex}>{children}</ConvexProvider>
    </Theme>
  );
}
