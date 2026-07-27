import { Badge, Button, Card, Separator, Typography } from "@aussieljk/frosted";
import { useState } from "react";
import { authClient, callbackURL } from "./client";
import { PANELS } from "./methods";
import { EmailPasswordPanel } from "./panels";
import { byId, ctaFor, PROVIDERS, type Provider } from "./providers";
import { RememberedAccounts } from "./RememberedAccounts";
import { BigButton, Feedback, RedirectOverlay } from "./ui";
import { useRunner } from "./useRunner";
import { useSetupStatus } from "./useSetupStatus";

const { Heading, Text } = Typography;

export type SignInProps = {
  /** The app this card signs into — drives the default heading. */
  appName?: string;
  /** Method ids to offer, in order. Defaults to every method. */
  methods?: string[];
  /** Method ids shown as buttons on the front of the card. */
  featured?: string[];
  /** The method whose form sits inline under the buttons. */
  primary?: string;
  /** Overrides the `Welcome to ${appName}` heading. */
  title?: string;
  /** Overrides the `${n} ways in. Pick one.` line under the heading. */
  subtitle?: string;
  /** A mark shown above the heading. */
  logo?: React.ReactNode;
  /** A line at the foot of the card. Omit for none. */
  footer?: React.ReactNode;
  /**
   * Badge methods whose credentials aren't set on the server as "needs setup".
   * Only useful on the AussieAuth deployment's own admin site; off by default,
   * so an embedding app never probes the status endpoint.
   */
  setupHints?: boolean;
};

const DEFAULT_FEATURED = ["google", "github", "apple"];
const DEFAULT_PRIMARY = "email-password";

/**
 * The sign-in card. The front shows any accounts this browser already knows,
 * then the featured social buttons plus the primary form; picking anything
 * from "more ways to sign in" swaps the body for that method's panel.
 */
export function SignIn({
  appName = "AussieAuth",
  methods,
  featured = DEFAULT_FEATURED,
  primary = DEFAULT_PRIMARY,
  title,
  subtitle,
  logo,
  footer,
  setupHints = false,
}: SignInProps = {}) {
  const [method, setMethod] = useState<string | null>(null);
  const [prefill, setPrefill] = useState("");
  const { needsSetup } = useSetupStatus(setupHints);

  const offered = methods ? PROVIDERS.filter((p) => methods.includes(p.id)) : PROVIDERS;

  const rest: Provider[] = offered.filter((p) => p.id !== primary && !featured.includes(p.id));

  const open = (id: string, withPrefill = "") => {
    setPrefill(withPrefill);
    setMethod(id);
  };

  if (method) {
    const provider = byId(method);
    const Panel = PANELS[method];
    return (
      <Shell>
        <div className="flex flex-col gap-1">
          <Button variant="ghost" className="-ml-1 self-start" onClick={() => setMethod(null)}>
            ← All sign-in options
          </Button>
          <Heading className="mt-2">{provider.label}</Heading>
        </div>
        {needsSetup(method) && <SetupHint id={method} />}
        <Panel prefill={prefill} />
      </Shell>
    );
  }

  const PrimaryPanel = PANELS[primary] ?? EmailPasswordPanel;

  return (
    <Shell>
      <div className="flex flex-col gap-1">
        {logo && <div className="mb-2">{logo}</div>}
        <Heading>{title ?? `Welcome to ${appName}`}</Heading>
        <Text color="gray">{subtitle ?? `${offered.length} ways in. Pick one.`}</Text>
      </div>

      <RememberedAccounts onNeedsPanel={open} />

      <div className="flex flex-col gap-2">
        {featured.map((id) => (
          <SocialButton key={id} id={id} disabled={needsSetup(id)} />
        ))}
      </div>

      <OrDivider label={`or continue with ${byId(primary).label.toLowerCase()}`} />

      <PrimaryPanel />

      <OrDivider label="more ways to sign in" />

      {/* Chips rather than underlined text: even tap targets, even rows, and
          the same surface language as the rest of the card. */}
      <div className="flex flex-wrap items-center gap-2">
        {rest.map((p) => (
          <Button key={p.id} size="1" variant="surface" onClick={() => open(p.id)}>
            {p.Logo && <p.Logo size={13} />}
            {p.label}
          </Button>
        ))}
      </div>

      {footer && (
        <Text color="gray" className="text-center">
          {footer}
        </Text>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-[420px]">
        <div className="flex flex-col gap-5">{children}</div>
      </Card>
    </div>
  );
}

function SocialButton({ id, disabled }: { id: string; disabled: boolean }) {
  const { pending, error, run } = useRunner();
  // Covers the card the moment it's clicked; only pulled back if the sign-in
  // call fails, since a success redirects the whole page to the provider.
  const [redirecting, setRedirecting] = useState(false);
  const provider = byId(id);
  return (
    <div className="flex flex-col gap-2">
      <BigButton
        pending={pending || disabled}
        icon={provider.Logo ? <provider.Logo size={18} /> : null}
        onClick={() => {
          setRedirecting(true);
          void run(() =>
            authClient.signIn.social({
              provider: id,
              callbackURL: callbackURL(),
            }),
          ).then((ok) => {
            if (!ok) setRedirecting(false);
          });
        }}
      >
        {ctaFor(provider)}
        {disabled && (
          <Badge color="amber" className="ml-2">
            needs setup
          </Badge>
        )}
      </BigButton>
      <Feedback error={error} />
      {redirecting && (
        <RedirectOverlay
          label={provider.label}
          icon={provider.Logo ? <provider.Logo size={40} /> : null}
        />
      )}
    </div>
  );
}

/**
 * Says how to switch a method on rather than letting it fail on click. Google
 * and Apple have guided walkthroughs; GitHub is two variables and doesn't need
 * one.
 */
function SetupHint({ id }: { id: string }) {
  const guide: Record<string, string> = {
    google: "/setup/google",
    apple: "/setup/apple",
  };
  const vars: Record<string, string> = {
    google: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET",
    github: "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET",
    apple: "APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID and APPLE_PRIVATE_KEY",
  };
  return (
    <Text color="amber">
      Set {vars[id] ?? "the provider credentials"} with <code>npx convex env set</code> to enable
      this.
      {guide[id] && (
        <>
          {" "}
          <a href={guide[id]} className="underline">
            Walk me through it →
          </a>
        </>
      )}
    </Text>
  );
}

function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <Separator className="flex-1" />
      <Text color="gray">{label}</Text>
      <Separator className="flex-1" />
    </div>
  );
}
