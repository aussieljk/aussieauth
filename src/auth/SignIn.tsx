import { Badge, Button, Card, Heading, Separator, Text } from "@aussieljk/frosted";
import { useState } from "react";
import { authClient, GOOGLE_CLIENT_ID } from "@/lib/auth-client";
import { PANELS } from "./methods";
import { EmailPasswordPanel } from "./panels";
import { byId, ctaFor, PROVIDERS, type Provider } from "./providers";
import { RememberedAccounts } from "./RememberedAccounts";
import { BigButton, Feedback } from "./ui";
import { useRunner } from "./useRunner";
import { useSetupStatus } from "./useSetupStatus";

export type SignInProps = {
  /** Method ids to offer, in order. Defaults to all sixteen. */
  methods?: string[];
  /** Method ids shown as buttons on the front of the card. */
  featured?: string[];
  /** The method whose form sits inline under the buttons. */
  primary?: string;
  title?: string;
  subtitle?: string;
};

const DEFAULT_FEATURED = ["google", "github", "apple"];
const DEFAULT_PRIMARY = "email-password";

/**
 * The sign-in card. The front shows any accounts this browser already knows,
 * then the featured social buttons plus the primary form; picking anything
 * from "more ways to sign in" swaps the body for that method's panel.
 */
export function SignIn({
  methods,
  featured = DEFAULT_FEATURED,
  primary = DEFAULT_PRIMARY,
  title = "Welcome to AussieAuth",
  subtitle,
}: SignInProps = {}) {
  const [method, setMethod] = useState<string | null>(null);
  const [prefill, setPrefill] = useState("");
  const { needsSetup } = useSetupStatus();

  const offered = methods ? PROVIDERS.filter((p) => methods.includes(p.id)) : PROVIDERS;

  // One Tap is a variant of the Google button rather than its own row, so it
  // never appears in the "more ways" list.
  const rest: Provider[] = offered.filter(
    (p) => p.id !== primary && !featured.includes(p.id) && p.id !== "google-one-tap",
  );
  const oneTapOffered =
    Boolean(GOOGLE_CLIENT_ID) &&
    offered.some((p) => p.id === "google-one-tap") &&
    !needsSetup("google");

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
        <Heading>{title}</Heading>
        <Text color="gray">{subtitle ?? `${offered.length} ways in. Pick one.`}</Text>
      </div>

      <RememberedAccounts onNeedsPanel={open} />

      <div className="flex flex-col gap-2">
        {featured.map((id) => (
          <SocialButton key={id} id={id} disabled={needsSetup(id)} />
        ))}
        {oneTapOffered && <OneTapButton />}
      </div>

      <OrDivider label={`or continue with ${byId(primary).label.toLowerCase()}`} />

      <PrimaryPanel />

      <OrDivider label="more ways to sign in" />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {rest.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => open(p.id)}
            className="flex items-center gap-1.5 text-[13px] text-[var(--gray-11)] underline decoration-[var(--gray-a6)] underline-offset-4 transition-colors hover:text-[var(--gray-12)]"
          >
            {p.Logo && <p.Logo size={13} />}
            {p.label}
          </button>
        ))}
      </div>

      <Text color="gray" className="text-center">
        Your apps talk to this server directly — no AussieAuth consent screen, ever.
      </Text>
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
  const provider = byId(id);
  return (
    <div className="flex flex-col gap-2">
      <BigButton
        pending={pending || disabled}
        icon={provider.Logo ? <provider.Logo size={18} /> : null}
        onClick={() =>
          void run(() =>
            authClient.signIn.social({
              provider: id,
              callbackURL: window.location.origin,
            }),
          )
        }
      >
        {ctaFor(provider)}
        {disabled && (
          <Badge color="amber" className="ml-2">
            needs setup
          </Badge>
        )}
      </BigButton>
      <Feedback error={error} />
    </div>
  );
}

function OneTapButton() {
  const { pending, error, run } = useRunner();
  return (
    <div className="flex flex-col gap-2">
      <BigButton pending={pending} onClick={() => void run(() => authClient.oneTap())}>
        One Tap sign-in
      </BigButton>
      <Feedback error={error} />
    </div>
  );
}

/** Tells you exactly which env vars are missing rather than failing on click. */
function SetupHint({ id }: { id: string }) {
  const vars: Record<string, string> = {
    google: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET",
    github: "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET",
    apple: "APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID and APPLE_PRIVATE_KEY",
  };
  return (
    <Text color="amber">
      Set {vars[id] ?? "the provider credentials"} with <code>npx convex env set</code> to enable
      this.
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
