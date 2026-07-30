import { Spinner, Typography, VStack } from "ljkui";
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "@/ErrorBoundary";
import { Chrome } from "@/site/Chrome";

const { Heading, Text } = Typography;

// The live card pulls in the whole auth client, so it loads as its own chunk —
// and only in the browser, because it reads localStorage on mount.
const LandingCard = lazy(() => import("@/site/LandingCard"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AussieAuth — one auth server, fifteen ways in" },
      {
        name: "description",
        content:
          "A self-hosted auth server on Convex and Better Auth. Fifteen sign-in methods, and no consent screen of its own — your users only ever approve the identity provider.",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "AussieAuth",
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          url: "https://aussieauth.com",
          description:
            "A self-hosted authentication server on Convex and Better Auth with fifteen sign-in methods and no consent screen of its own.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
        }),
      },
    ],
  }),
  component: Landing,
});

/**
 * Split screen: a one-line pitch on the left, the live sign-in card on the
 * right. The card is the product, so it gets top billing when the layout
 * collapses to one column.
 */
function Landing() {
  return (
    <Chrome bleed>
      <div className="grid w-full lg:grid-cols-2 lg:items-start">
        <div className="order-2 flex w-full justify-center px-6 py-14 lg:col-start-1 lg:row-start-1 lg:min-h-[calc(100vh-3.5rem)] lg:items-center">
          <VStack alignment="leading" spacing={20} className="w-full min-w-0 max-w-md">
            <Heading size="8" className="text-balance">
              One auth server. Fifteen ways in.
            </Heading>
            <Text size="4" color="gray">
              Self-hosted on Convex and Better Auth. Your app talks to it from its own origin — no
              consent screen of its own, ever.
            </Text>
          </VStack>
        </div>

        {/* The product's half: stays put below the sticky header while the
            pitch scrolls, and scrolls internally when taller than the viewport. */}
        <div className="order-1 min-w-0 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto">
          <LiveCard />
        </div>
      </div>
    </Chrome>
  );
}

/**
 * The right half: the actual sign-in card, mounted only in the browser. The
 * landing page is prerendered to static HTML, and the card reads localStorage
 * (remembered accounts, the session jar) in its first render — so the build
 * sees this placeholder and real visitors see the card a beat later.
 */
function LiveCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const placeholder = (
    <div className="flex min-h-[420px] items-center justify-center lg:min-h-[calc(100vh-3.5rem)]">
      <Spinner size="3" />
    </div>
  );

  if (!mounted) return placeholder;
  return (
    // Its own boundary, so a broken card (a misconfigured deployment URL, a
    // failed chunk) degrades to an error box in this column instead of taking
    // the whole marketing page with it.
    <ErrorBoundary>
      <Suspense fallback={placeholder}>
        <LandingCard />
      </Suspense>
    </ErrorBoundary>
  );
}
