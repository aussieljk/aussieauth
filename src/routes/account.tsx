import { createFileRoute, Navigate, useRouter } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { useEffect } from "react";
import { Account } from "@/account/Account";
import { AuthProvider } from "@/auth/AuthProvider";
import { RouteLoading } from "@aussieljk/auth";

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
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();

  // Warm the sign-in chunk so signing out is an instant client navigation
  // rather than a chunk download at the moment of the click.
  useEffect(() => {
    void router.preloadRoute({ to: "/sign-in" });
  }, [router]);

  // Waiting matters here in a way it doesn't on `/sign-in`: bouncing on the
  // first frame would throw out anyone whose stored session is still settling.
  // Show the spinner rather than `null`, because this is exactly the wait a
  // fresh OAuth return lands in — a blank screen there looked like a hang.
  if (isLoading) return <RouteLoading />;
  if (!isAuthenticated) return <Navigate to="/sign-in" replace />;
  return <Account />;
}
