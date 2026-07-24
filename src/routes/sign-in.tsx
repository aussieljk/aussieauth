import { createFileRoute, Navigate, useRouter } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { useEffect } from "react";
import { SignIn } from "@aussieljk/auth";
import { AuthProvider } from "@/auth/AuthProvider";

export const Route = createFileRoute("/sign-in")({
  // The session is a cookie jar in localStorage — `crossDomainClient` can't be
  // handed a cookie on a `.convex.site` response — so there is nothing a server
  // render could know about who this is.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — AussieAuth" },
      {
        name: "description",
        content:
          "Sign in to AussieAuth with any of sixteen methods: Google, Apple, GitHub, passkeys, Solana, magic links, one-time codes and more.",
      },
    ],
  }),
  component: SignInRoute,
});

/**
 * Named, and referenced by name — an inline arrow here would keep the imports
 * above in the route-tree module, which every page loads. As written the
 * splitter can lift this component and the entire auth client with it into a
 * chunk only this route pulls.
 */
function SignInRoute() {
  return (
    <AuthProvider>
      <SignInOrAccount />
    </AuthProvider>
  );
}

function SignInOrAccount() {
  const router = useRouter();
  // `useConvexAuth` rather than `<AuthLoading>`: while auth is settling we want
  // the sign-in form itself on screen, not a spinner standing in for it.
  const { isAuthenticated } = useConvexAuth();

  // A credential or passkey sign-in flips `isAuthenticated` in place and this
  // navigates on to `/account` — a client navigation, so preloading its chunk
  // now is the difference between that redirect being instant and stalling on a
  // download. (OAuth methods leave via a full page load and can't benefit, but
  // the spinner on `/account` covers those.)
  useEffect(() => {
    void router.preloadRoute({ to: "/account" });
  }, [router]);

  if (isAuthenticated) return <Navigate to="/account" replace />;
  // The app already sits inside a `<Theme>` (see __root.tsx), so this uses the
  // raw `SignIn` rather than `AussieAuthSignIn`. `setupHints` is on because this
  // is the deployment's own admin site — the place you configure credentials.
  return (
    <SignIn
      appName="AussieAuth"
      setupHints
      footer="Your apps talk to this server directly — no AussieAuth consent screen, ever."
    />
  );
}
