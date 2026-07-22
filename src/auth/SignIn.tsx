import { useQuery } from "convex/react";
import { Badge, Button, Card, Heading, Separator, Text } from "frosted-ui";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { PANELS } from "./methods";
import { EmailPasswordPanel } from "./panels";
import { byId, ctaFor, PROVIDERS, type Provider } from "./providers";
import { useRunner } from "./useRunner";
import { authClient } from "@/lib/auth-client";
import { BigButton, Feedback } from "./ui";

/** Shown as buttons on the front of the card; everything else is one tap away. */
const FEATURED = ["google", "github", "apple"];
const PRIMARY = "email-password";

const REST: Provider[] = PROVIDERS.filter(
  (p) =>
    p.id !== PRIMARY && !FEATURED.includes(p.id) && p.id !== "google-one-tap",
);

/**
 * The sign-in card. The front shows the three social buttons plus the email
 * form; picking anything from "more ways to sign in" swaps the body for that
 * method's panel.
 */
export function SignIn() {
  const [method, setMethod] = useState<string | null>(null);
  const setup = useQuery(api.status.setup);

  const needsSetup = (id: string) =>
    setup !== undefined && id in setup && !setup[id as keyof typeof setup];

  if (method) {
    const provider = byId(method);
    const Panel = PANELS[method];
    return (
      <Shell>
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="1"
            className="-ml-1 self-start"
            onClick={() => setMethod(null)}
          >
            ← All sign-in options
          </Button>
          <Heading size="5" className="mt-2">
            {provider.label}
          </Heading>
        </div>
        {needsSetup(method) && <SetupHint id={method} />}
        <Panel />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col gap-1">
        <Heading size="6">Welcome to AussieAuth</Heading>
        <Text size="2" color="gray">
          Sixteen ways in. Pick one.
        </Text>
      </div>

      <div className="flex flex-col gap-2">
        {FEATURED.map((id) => (
          <SocialButton key={id} id={id} disabled={needsSetup(id)} />
        ))}
        {setup?.google && <OneTapButton />}
      </div>

      <OrDivider label="or continue with email" />

      <EmailPasswordPanel />

      <OrDivider label="more ways to sign in" />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {REST.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setMethod(p.id)}
            className="flex items-center gap-1.5 text-[13px] text-[var(--gray-11)] underline decoration-[var(--gray-a6)] underline-offset-4 transition-colors hover:text-[var(--gray-12)]"
          >
            {p.Logo && <p.Logo size={13} />}
            {p.label}
          </button>
        ))}
      </div>

      <Text size="1" color="gray" className="text-center">
        Your apps talk to this server directly — no AussieAuth consent screen,
        ever.
      </Text>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card size="4" className="w-[420px]">
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
          <Badge size="1" color="amber" className="ml-2">
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
      <BigButton
        pending={pending}
        onClick={() => void run(() => authClient.oneTap())}
      >
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
    <Text size="1" color="amber">
      Set {vars[id] ?? "the provider credentials"} with{" "}
      <code>npx convex env set</code> to enable this.
    </Text>
  );
}

function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <Separator className="flex-1" />
      <Text size="1" color="gray">
        {label}
      </Text>
      <Separator className="flex-1" />
    </div>
  );
}
