import { Alert, Link as UiLink } from "ljkui";
import { Link } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { SignIn } from "@aussieljk/auth";
import { AuthProvider } from "@/auth/AuthProvider";

/**
 * The live sign-in card, on the landing page. Not a mockup — it's the same
 * `<SignIn>` the package ships, signed into this deployment. Loaded lazily and
 * only in the browser (see the landing route), so the marketing page's initial
 * chunk still doesn't carry the auth client.
 *
 * Deliberately still the sign-in card when a session already exists: the card
 * is the product being demonstrated, so it stays on screen and a notice inside
 * it points at the account page instead.
 */
export default function LandingCard() {
  return (
    <AuthProvider>
      <SignIn
        appName="AussieAuth"
        title="Try it right here"
        subtitle="The real card, signed into this deployment."
        notice={<SignedInNotice />}
        footer="Every method below is live — this is the same component your apps embed."
      />
    </AuthProvider>
  );
}

/** Sits inside the card, under the heading — see `SignIn`'s `notice`. */
function SignedInNotice() {
  const { isAuthenticated } = useConvexAuth();
  if (!isAuthenticated) return null;

  return (
    <Alert.Root color="green">
      <Alert.Title>G&rsquo;day — you&rsquo;re already signed in</Alert.Title>
      <Alert.Description>
        <UiLink render={<Link to="/account" />}>Your account is over here →</UiLink> Or sign in
        again below with a different method.
      </Alert.Description>
    </Alert.Root>
  );
}
