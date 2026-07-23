import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { Account } from "@/account/Account";
import { AuthProvider } from "@/auth/AuthProvider";

export const Route = createFileRoute("/account")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Your account — AussieAuth" },
      // Nothing here is public; keep it out of the index entirely.
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountRoute,
});

/** Named for the same reason as `/sign-in`: see the note there. */
function AccountRoute() {
  return (
    <AuthProvider>
      <SignedIn />
    </AuthProvider>
  );
}

function SignedIn() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  // Waiting matters here in a way it doesn't on `/sign-in`: bouncing on the
  // first frame would throw out anyone whose stored session is still settling.
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/sign-in" replace />;
  return <Account />;
}
