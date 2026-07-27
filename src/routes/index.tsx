import { Badge, Button, HStack, Spinner, Typography, VStack } from "@aussieljk/frosted";
import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { PROVIDERS } from "@aussieljk/auth";
import { DocLink } from "@/docs/DocLink";
import { ErrorBoundary } from "@/ErrorBoundary";
import { Chrome } from "@/site/Chrome";
// Fenced code run through the same shiki pipeline as the docs, at build time —
// the browser gets coloured HTML, not a highlighter.
import DropInSnippet from "@/site/snippets/drop-in.md";
import RegisterSnippet from "@/site/snippets/register-app.md";

const { Heading, Text } = Typography;

// The live card pulls in the whole auth client, so it loads as its own chunk —
// and only in the browser, because it reads localStorage on mount.
const LandingCard = lazy(() => import("@/site/LandingCard"));

const FAQ = [
  {
    q: "Does AussieAuth show its own consent screen?",
    a: "No. An app using AussieAuth talks to the Convex deployment from its own origin, so the only consent screen a user sees is the identity provider's — Google's, Apple's or GitHub's.",
  },
  {
    q: "Is AussieAuth a hosted service?",
    a: "No. It's a Convex deployment you run yourself, so the sessions live in your database and there's no per-user pricing.",
  },
  {
    q: "How many sign-in methods does it support?",
    a: "Fifteen: Google, GitHub, Apple, Solana wallet, passkeys, email/password, phone/password, username/password, magic links, email OTP, SMS codes, a shared demo account, anonymous sessions, Mullvad-style account numbers, and API keys for agents.",
  },
  {
    q: "Can one deployment serve several apps?",
    a: "Yes. Each app registers its own origins and method allow-list at runtime, and a passkey created on one can be used from the others.",
  },
];

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
        // Structured data is how an answer engine tells what this page is
        // about without inferring it from prose.
        children: JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "AussieAuth",
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Any",
            url: "https://aussieauth.com",
            description:
              "A self-hosted authentication server on Convex and Better Auth with fifteen sign-in methods and no consent screen of its own.",
            offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          },
        ]),
      },
    ],
  }),
  component: Landing,
});

/**
 * A true split screen: the pitch fills the left 50vw with its content centred
 * in that half, the live sign-in card fills the right 50vw on its own raised
 * surface. The halves read as two different rooms, not two columns of one.
 *
 * Structure is Tailwind (frosted has no responsive column primitive); all
 * type, colour and spacing inside it are frosted props.
 */
function Landing() {
  return (
    <Chrome bleed>
      {/* `items-start` is load-bearing: grid items otherwise stretch to the
          row's full height, which leaves the sticky panel nothing to stick
          within. */}
      <div className="grid w-full lg:grid-cols-2 lg:items-start">
        <div className="flex w-full justify-center px-6 py-14">
          <VStack alignment="leading" spacing={56} className="w-full min-w-0 max-w-xl">
            <Hero />
            <Methods />
            <RegisterSection />
            <DropInSection />
            <Questions />
          </VStack>
        </div>

        {/* The product's half: its own raised surface, split off by a
            hairline, and it stays put (below the sticky header) while the
            pitch scrolls. */}
        <div className="min-w-0 border-t border-[var(--gray-alpha-200)] bg-[var(--gray-surface)] lg:sticky lg:top-[65px] lg:min-h-[calc(100vh-65px)] lg:border-l lg:border-t-0">
          <LiveCard />
        </div>
      </div>
    </Chrome>
  );
}

function Hero() {
  return (
    <VStack alignment="leading" spacing={20}>
      <Badge color="green">Fifteen methods, one deployment</Badge>
      {/* The page's only h1; every other heading steps down from it. */}
      <Heading size="8" className="text-balance">
        One auth server. Fifteen ways in. No consent screen of its own.
      </Heading>
      <Text size="4">
        AussieAuth is a self-hosted auth server on Convex and Better Auth. Your app talks to it from
        its own origin, so signing in with Google shows Google&rsquo;s consent screen — and nothing
        else.
      </Text>
      <HStack spacing={12}>
        <Link to="/sign-in">
          <Button size="3" variant="classic" color="green">
            Try every method
          </Button>
        </Link>
        <Link to="/docs">
          <Button size="3" variant="surface">
            Read the docs
          </Button>
        </Link>
      </HStack>
    </VStack>
  );
}

function Methods() {
  return (
    <VStack alignment="leading" spacing={16} className="w-full">
      <VStack alignment="leading" spacing={4}>
        <Heading render={<h2 />} size="5">
          Every method, ready to configure
        </Heading>
        <Text>
          Each one registers only when its credentials are set, so a deployment offers exactly what
          it&rsquo;s configured for.
        </Text>
      </VStack>
      {/* Driven off the same list the sign-in card renders, so this can't
          advertise a method the app doesn't actually implement. Plain rows —
          the content is the surface. */}
      <div className="grid w-full gap-x-6 gap-y-4 sm:grid-cols-2">
        {PROVIDERS.map((provider) => (
          <HStack key={provider.id} alignment="top" spacing={10}>
            {/* Always rendered, so labels line up whether or not there's a
                brand mark — an empty slot beats a zigzagging text column. */}
            <span className="mt-0.5 flex w-4 shrink-0 justify-center">
              {provider.Logo && <provider.Logo size={16} />}
            </span>
            <VStack alignment="leading" spacing={2} className="min-w-0 flex-1">
              <Text size="2" weight="medium">
                {provider.label}
              </Text>
              <Text size="1" color="gray" className="w-full truncate">
                {provider.hint}
              </Text>
            </VStack>
          </HStack>
        ))}
      </div>
    </VStack>
  );
}

function RegisterSection() {
  return (
    <VStack alignment="leading" spacing={8} className="w-full">
      <Heading render={<h2 />} size="5">
        An app registers itself
      </Heading>
      <Text>
        One POST, on boot. Its origins become trusted, land in the passkey related-origins list, and
        stamp every session it creates.
      </Text>
      <Snippet>
        <RegisterSnippet />
      </Snippet>
      <DocLink slug="embedding" className="underline">
        How embedding works →
      </DocLink>
    </VStack>
  );
}

function DropInSection() {
  return (
    <VStack alignment="leading" spacing={8} className="w-full">
      <Heading render={<h2 />} size="5">
        Then drop in the card
      </Heading>
      <Text>
        Install <code>@aussieljk/auth</code> and point it at the deployment. It doesn&rsquo;t import
        Convex, so it works in a non-Convex frontend too.
      </Text>
      <Snippet>
        <DropInSnippet />
      </Snippet>
      <DocLink slug="quickstart" className="underline">
        Start here →
      </DocLink>
    </VStack>
  );
}

/** The docs' code-box styling (`.prose pre`), shiki colours included. */
function Snippet({ children }: { children: React.ReactNode }) {
  return <div className="prose w-full">{children}</div>;
}

function Questions() {
  return (
    <VStack alignment="leading" spacing={16} className="w-full">
      <Heading render={<h2 />} size="5">
        Questions
      </Heading>
      <VStack alignment="leading" spacing={20} className="w-full">
        {FAQ.map((item) => (
          <VStack key={item.q} alignment="leading" spacing={4}>
            <Text weight="medium">{item.q}</Text>
            <Text color="gray">{item.a}</Text>
          </VStack>
        ))}
      </VStack>
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
    <div className="flex min-h-[420px] items-center justify-center lg:min-h-[calc(100vh-65px)]">
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
