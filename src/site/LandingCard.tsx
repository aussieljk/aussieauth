import { Alert } from "@aussieljk/frosted";
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
 * is the product being demonstrated, so it stays on screen and a banner above
 * it points at the account page instead.
 */
export default function LandingCard() {
  return (
    <AuthProvider>
      <div className="relative">
        <SignedInBanner />
        <SignIn
          appName="AussieAuth"
          title="Try it right here"
          subtitle="The real card, signed into this deployment."
          footer="Every method below is live — this is the same component your apps embed."
        />
      </div>
    </AuthProvider>
  );
}

function SignedInBanner() {
  const { isAuthenticated } = useConvexAuth();
  if (!isAuthenticated) return null;

  return (
    // Floats over the top of the panel rather than sitting in the flow, so the
    // card underneath stays exactly where it is when the session appears.
    <div className="absolute inset-x-0 top-0 z-10 p-4">
      <Alert.Root color="green">
        <Alert.Description>
          G&rsquo;day — you&rsquo;re already signed in.{" "}
          <Link to="/account" className="underline">
            Your account is over here →
          </Link>{" "}
          Or sign in again below with a different method.
        </Alert.Description>
      </Alert.Root>
    </div>
  );
}
