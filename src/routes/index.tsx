import { Badge, Button, Card, HStack, Spinner, Typography, VStack } from "@aussieljk/frosted";
import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { PROVIDERS } from "@aussieljk/auth";
import { DocLink } from "@/docs/DocLink";
import { ErrorBoundary } from "@/ErrorBoundary";
import { Chrome } from "@/site/Chrome";

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
 * Layout, top to bottom: a 50/50 split — the pitch on the left, the live
 * sign-in card on the right — then everything that reads better wide (the
 * embedding cards, the FAQ) at full width underneath.
 *
 * Structure is Tailwind (frosted has no responsive column primitive); all
 * type, colour and spacing inside it are frosted props.
 */
function Landing() {
  return (
    <Chrome>
      <VStack alignment="leading" spacing={56} className="w-full">
        {/* `grid` at every width (one column stacked, two from lg) rather than
            flex-to-grid: the package stylesheet also declares `.flex`, and its
            copy loads later, so a `flex lg:grid` combination loses the toss. */}
        <div className="grid w-full gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
          <VStack alignment="leading" spacing={48} className="min-w-0 pt-10">
            <Hero />
            <Methods />
          </VStack>
          {/* Offset by the sticky header's height, so the card's own heading
              doesn't tuck underneath it on scroll. */}
          <div className="min-w-0 lg:sticky lg:top-[65px]">
            <LiveCard />
          </div>
        </div>

        <section className="grid w-full gap-4 md:grid-cols-2">
          <RegisterCard />
          <DropInCard />
        </section>

        <Questions />
      </VStack>
    </Chrome>
  );
}

function Hero() {
  return (
    <VStack alignment="leading" spacing={20}>
      <Badge color="green">Fifteen methods, one deployment</Badge>
      {/* The page's only h1; every other heading steps down from it. */}
      <Heading size="8" className="max-w-3xl text-balance">
        One auth server. Fifteen ways in. No consent screen of its own.
      </Heading>
      <Text size="4" className="max-w-2xl">
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
          advertise a method the app doesn't actually implement. */}
      <div className="grid w-full gap-2 sm:grid-cols-2">
        {PROVIDERS.map((provider) => (
          <Card key={provider.id} size="1">
            <HStack alignment="top" spacing={10}>
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
          </Card>
        ))}
      </div>
    </VStack>
  );
}

function RegisterCard() {
  return (
    <Card size="3">
      <VStack alignment="leading" spacing={8}>
        <Heading render={<h2 />} size="4">
          An app registers itself
        </Heading>
        <Text>
          One POST, on boot. Its origins become trusted, land in the passkey related-origins list,
          and stamp every session it creates.
        </Text>
        <Snippet>
          {`await fetch(\`\${AUSSIEAUTH_URL}/apps/register\`, {
  method: "POST",
  headers: { authorization: \`Bearer \${SECRET}\` },
  body: JSON.stringify({
    slug: "portfolio",
    name: "Portfolio",
    origins: ["https://portfolio.com"],
    methods: ["google", "passkey"],
  }),
});`}
        </Snippet>
        <DocLink slug="embedding" className="underline">
          How embedding works →
        </DocLink>
      </VStack>
    </Card>
  );
}

function DropInCard() {
  return (
    <Card size="3">
      <VStack alignment="leading" spacing={8}>
        <Heading render={<h2 />} size="4">
          Then drop in the card
        </Heading>
        <Text>
          Install <code>@aussieljk/auth</code> and point it at the deployment. It doesn&rsquo;t
          import Convex, so it works in a non-Convex frontend too.
        </Text>
        <Snippet>
          {`import { AussieAuthSignIn } from "@aussieljk/auth";

<AussieAuthSignIn
  featured={["google", "apple"]}
  primary="passkey"
/>;`}
        </Snippet>
        <DocLink slug="quickstart" className="underline">
          Start here →
        </DocLink>
      </VStack>
    </Card>
  );
}

/** One code sample, sized to be read rather than squinted at. */
function Snippet({ children }: { children: string }) {
  return (
    <pre className="w-full overflow-x-auto rounded-lg border border-[var(--gray-a4)] bg-[var(--gray-2)] p-4 text-[13.5px] leading-relaxed">
      {children}
    </pre>
  );
}

function Questions() {
  return (
    <VStack alignment="leading" spacing={16} className="w-full pb-10">
      <Heading render={<h2 />} size="5">
        Questions
      </Heading>
      <div className="grid w-full gap-x-10 gap-y-6 md:grid-cols-2">
        {FAQ.map((item) => (
          <VStack key={item.q} alignment="leading" spacing={4}>
            <Text weight="medium">{item.q}</Text>
            <Text color="gray">{item.a}</Text>
          </VStack>
        ))}
      </div>
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
