import { ConvexBetterAuthProvider, type AuthClient } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { useRememberSignedInAccount } from "@aussieljk/auth";
import { authClient } from "@/lib/auth";

/**
 * Convex + Better Auth, for the two routes that actually sign someone in.
 *
 * Deliberately not in `__root.tsx`. The landing page and the docs need none of
 * this, and hoisting it to the root would put the Convex client and all
 * fourteen Better Auth client plugins in the bundle every visitor downloads
 * before they've decided to sign in at all.
 */

let client: ConvexReactClient | undefined;

/**
 * Built on first render rather than at module scope, because the route files
 * that import this are also evaluated while prerendering, and a Convex client
 * constructed there would open a socket from the build.
 */
const convex = () =>
  // `expectAuth` holds queries until Better Auth has settled, so authenticated
  // queries don't fire once as anonymous and then again as the real user.
  (client ??= new ConvexReactClient(import.meta.env.VITE_CONVEX_URL, {
    expectAuth: true,
  }));

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    /* `AuthClient` is a loose structural union that a client with this many
       plugins never quite matches; the provider only calls useSession and
       $fetch, both of which are present. */
    <ConvexBetterAuthProvider client={convex()} authClient={authClient as unknown as AuthClient}>
      <RememberAccount />
      {children}
    </ConvexBetterAuthProvider>
  );
}

/**
 * Has to sit inside the provider to see the session, and renders nothing —
 * so it's a sibling rather than a wrapper around `children`.
 */
function RememberAccount() {
  useRememberSignedInAccount();
  return null;
}
