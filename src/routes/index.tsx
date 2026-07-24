import { Badge, Button, Card, Typography } from "@aussieljk/frosted";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PROVIDERS } from "@aussieljk/auth";
import { DocLink } from "@/docs/DocLink";
import { Chrome } from "@/site/Chrome";

const { Heading, Text } = Typography;

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
    a: "Sixteen: Google, Google One Tap, GitHub, Apple, Solana wallet, passkeys, email/password, phone/password, username/password, magic links, email OTP, SMS codes, a shared demo account, anonymous sessions, Mullvad-style account numbers, and API keys for agents.",
  },
  {
    q: "Can one deployment serve several apps?",
    a: "Yes. Each app registers its own origins and method allow-list at runtime, and a passkey created on one can be used from the others.",
  },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AussieAuth — one auth server, sixteen ways in" },
      {
        name: "description",
        content:
          "A self-hosted auth server on Convex and Better Auth. Sixteen sign-in methods, and no consent screen of its own — your users only ever approve the identity provider.",
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
              "A self-hosted authentication server on Convex and Better Auth with sixteen sign-in methods and no consent screen of its own.",
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

function Landing() {
  return (
    <Chrome>
      <section className="flex flex-col items-start gap-5 py-10">
        <Badge color="green">Sixteen methods, one deployment</Badge>
        <Heading className="max-w-3xl text-balance text-4xl leading-tight sm:text-5xl">
          One auth server. Sixteen ways in. No consent screen of its own.
        </Heading>
        <Text color="gray" className="max-w-2xl text-lg">
          AussieAuth is a self-hosted auth server on Convex and Better Auth. Your app talks to it
          from its own origin, so signing in with Google shows Google&rsquo;s consent screen — and
          nothing else.
        </Text>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/sign-in">
            <Button size="3">Try every method</Button>
          </Link>
          <Link to="/docs">
            <Button size="3" variant="surface">
              Read the docs
            </Button>
          </Link>
        </div>
      </section>

      <section className="py-10">
        <Heading className="text-xl">Every method, ready to configure</Heading>
        <Text color="gray" className="mt-1 block">
          Each one registers only when its credentials are set, so a deployment offers exactly what
          it&rsquo;s configured for.
        </Text>
        {/* Driven off the same list the sign-in card renders, so this can't
            advertise a method the app doesn't actually implement. */}
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              className="flex items-start gap-2.5 rounded-md border border-[var(--gray-a4)] px-3 py-2.5"
            >
              {provider.Logo && (
                <span className="mt-0.5">
                  <provider.Logo size={16} />
                </span>
              )}
              <span className="flex min-w-0 flex-col">
                <Text weight="medium">{provider.label}</Text>
                <Text color="gray">{provider.hint}</Text>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 py-10 lg:grid-cols-2">
        <Card>
          <div className="flex flex-col gap-2">
            <Heading className="text-lg">An app registers itself</Heading>
            <Text color="gray">
              One POST, on boot. Its origins become trusted, land in the passkey related-origins
              list, and stamp every session it creates.
            </Text>
            <pre className="mt-1 overflow-x-auto rounded-md border border-[var(--gray-a4)] bg-[var(--gray-2)] p-3 text-[12.5px] leading-relaxed">
              {`await fetch(\`\${AUSSIEAUTH_URL}/apps/register\`, {
  method: "POST",
  headers: {
    authorization: \`Bearer \${process.env.AUSSIEAUTH_SECRET}\`,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    slug: "portfolio",
    name: "Portfolio",
    origins: ["https://portfolio.com"],
    methods: ["google", "passkey"],
  }),
});`}
            </pre>
            <DocLink slug="embedding" className="mt-1 underline">
              How embedding works →
            </DocLink>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-2">
            <Heading className="text-lg">Then drop in the card</Heading>
            <Text color="gray">
              Copy <code>src/auth/</code> into the app and point it at the deployment. Nothing under
              it imports Convex, so it works in a non-Convex frontend too.
            </Text>
            <pre className="mt-1 overflow-x-auto rounded-md border border-[var(--gray-a4)] bg-[var(--gray-2)] p-3 text-[12.5px] leading-relaxed">
              {`import { SignIn } from "./auth/SignIn";

<SignIn
  featured={["google", "apple"]}
  primary="passkey"
/>;`}
            </pre>
            <DocLink slug="quickstart" className="mt-1 underline">
              Start here →
            </DocLink>
          </div>
        </Card>
      </section>

      <section className="py-10">
        <Heading className="text-xl">Questions</Heading>
        <div className="mt-4 flex max-w-3xl flex-col gap-5">
          {FAQ.map((item) => (
            <div key={item.q} className="flex flex-col gap-1">
              <Text weight="medium">{item.q}</Text>
              <Text color="gray">{item.a}</Text>
            </div>
          ))}
        </div>
      </section>
    </Chrome>
  );
}
