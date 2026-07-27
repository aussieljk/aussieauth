import { Button, Card, Typography } from "@aussieljk/frosted";
import { Link } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { SignIn } from "@aussieljk/auth";
import { AuthProvider } from "@/auth/AuthProvider";

const { Heading, Text } = Typography;

/**
 * The live sign-in card, on the landing page. Not a mockup — it's the same
 * `<SignIn>` the package ships, signed into this deployment. Loaded lazily and
 * only in the browser (see the landing route), so the marketing page's initial
 * chunk still doesn't carry the auth client.
 */
export default function LandingCard() {
  return (
    <AuthProvider>
      <CardOrSignedIn />
    </AuthProvider>
  );
}

function CardOrSignedIn() {
  const { isAuthenticated } = useConvexAuth();

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-[420px]">
          <div className="flex flex-col items-start gap-3">
            <Heading>You&rsquo;re signed in</Heading>
            <Text color="gray">This card is the live product — and it already knows you.</Text>
            <Link to="/account">
              <Button variant="classic">Your account →</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <SignIn
      appName="AussieAuth"
      title="Try it right here"
      subtitle="The real card, signed into this deployment."
      footer="Every method below is live — this is the same component your apps embed."
    />
  );
}
