import { Card, Spinner, Typography, VStack } from "ljkui";
import { createFileRoute } from "@tanstack/react-router";
import { lazy, type ReactNode, Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "@/ErrorBoundary";
import { Chrome } from "@/site/Chrome";

const { Code, Heading, Text } = Typography;

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
          "An auth server on Convex and Better Auth, hosted or forked. Fifteen sign-in methods, and no consent screen of its own — your users only ever approve the identity provider.",
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
            "An authentication server on Convex and Better Auth with fifteen sign-in methods and no consent screen of its own.",
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
              On Convex and Better Auth. Use this deployment or fork your own — either way your app
              talks to it from its own origin, with no consent screen of its own, ever.
            </Text>
            <VStack alignment="leading" spacing={12} className="w-full">
              <Proof title="One consent, not two">
                Signing in with Google shows Google's screen and nothing else — there's no
                AussieAuth page in the middle to approve.
              </Proof>
              <Proof title="Built for agents and anonymity">
                Long-lived agent keys and Mullvad-style account numbers are first-class, not
                afterthoughts — sign in with no email, or no human, at all.
              </Proof>
              <Proof title="Lazy or self-hosted, your call">
                Point an app at this deployment in three commands, or fork the repo and own the
                database. The difference is one line of config, so the first isn't a trap.
              </Proof>
            </VStack>
            <TwoWays />
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
 * The two paths, named the same way everywhere else — the docs pages, the
 * CLI's own output, and the `--self-hosted` flag. Someone who
 * lands here and reads nothing else should still leave knowing there are two,
 * which one is the default, and what the second one buys.
 */
function TwoWays() {
  return (
    // Stacked, not side by side: the pitch column is `max-w-md`, and two
    // columns inside it leave neither command enough room to sit on one line.
    <div className="grid w-full gap-3">
      <Way
        title="Way 1 — lazy"
        href="/docs/lazy"
        blurb="We mint the session, your deployment verifies it. No auth code in your repo."
        command={"bun add @aussieljk/auth\nbunx aussieauth init\nbunx convex dev"}
      />
      <Way
        title="Way 2 — self-hosted"
        href="/docs/self-hosted"
        blurb="You mint it, from a fork of this repo. Your database, your credentials, your domain."
        command={"bun add @aussieljk/auth\nbunx aussieauth init --self-hosted\nbunx convex dev"}
      />
    </div>
  );
}

function Way({
  title,
  href,
  blurb,
  command,
}: {
  title: string;
  href: string;
  blurb: string;
  command: string;
}) {
  return (
    <Card render={<a href={href} />} className="h-full">
      <VStack alignment="leading" spacing={6}>
        <Text weight="medium">{title}</Text>
        <Text color="gray" size="2">
          {blurb}
        </Text>
        {/* The self-hosted command is wider than the card at every breakpoint
            the grid uses, so it scrolls inside itself rather than pushing the
            page sideways. */}
        <Code className="w-full max-w-full overflow-x-auto whitespace-pre" size="1" color="gray">
          {command}
        </Code>
      </VStack>
    </Card>
  );
}

/**
 * One proof point under the pitch: a bolded claim and a line that backs it.
 * Three of these carry the differentiators the hero line can't spell out —
 * single consent, agent/anonymous auth, and the choice of the two ways in.
 */
function Proof({ title, children }: { title: string; children: ReactNode }) {
  return (
    <VStack alignment="leading" spacing={2}>
      <Text weight="medium">{title}</Text>
      <Text color="gray">{children}</Text>
    </VStack>
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
