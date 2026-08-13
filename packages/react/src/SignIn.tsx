import {
  Alert,
  Badge,
  Button,
  Card,
  Link as UiLink,
  Typography,
  VStack,
} from "ljkui";
import { useState } from "react";
import { useAppRegistration } from "./appInfo";
import { useAuthBaseURL, useAuthClient, useCallbackURL } from "./context";
import { PROVIDER_ENV_VARS } from "./errors";
import { PANELS } from "./methods";
import { EmailPasswordPanel } from "./panels";
import { byId, ctaFor, PROVIDERS, type Provider } from "./providers";
import { RememberedAccounts } from "./RememberedAccounts";
import { BigButton, Feedback, RedirectOverlay } from "./ui";
import { useRunner } from "./useRunner";
import { useSetupStatus } from "./useSetupStatus";

const { Code, Heading, Text } = Typography;

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
   * A message at the top of the card body, under the heading — an alert, a
   * note about the session already open. In the card rather than floated over
   * it, so it can never land on top of the heading.
   */
  notice?: React.ReactNode;
  /**
   * Badge methods whose credentials aren't set on the server as "needs setup".
   * Only useful on the AussieAuth deployment's own admin site; off by default,
   * so an embedding app never probes the status endpoint.
   */
  setupHints?: boolean;
  /**
   * Ask the deployment which methods this app actually registered, and draw
   * only those.
   *
   * On by default, because the alternative is what it replaces: buttons that
   * are guaranteed to come back 403, found one click at a time. One cached GET
   * to `/apps/me` per deployment. Turn it off for a card that should render a
   * fixed set regardless of what the server says — a screenshot, a fixture, a
   * design review.
   */
  respectRegistration?: boolean;
};

const DEFAULT_FEATURED = ["google", "github", "apple"];
const DEFAULT_PRIMARY = "email-password";

/**
 * The sign-in card. The front shows any accounts this browser already knows,
 * then the primary form, then the featured social buttons underneath it.
 * Picking a remembered account swaps the body for that method's panel.
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
  notice,
  setupHints = false,
  respectRegistration = true,
}: SignInProps = {}) {
  const [method, setMethod] = useState<string | null>(null);
  const [prefill, setPrefill] = useState("");
  const { needsSetup } = useSetupStatus(setupHints);
  const { app, allows, blocked } = useAppRegistration(respectRegistration);

  // Two filters, and they answer different questions. `methods` is what this
  // card was asked to show; `allows` is what the server will actually accept.
  // Anything failing the second is a button whose only possible outcome is a
  // 403, so it isn't drawn at all.
  const offered = (methods ? PROVIDERS.filter((p) => methods.includes(p.id)) : PROVIDERS).filter(
    (p) => allows(p.id),
  );

  const shownFeatured = featured.filter(allows);
  // Falling back keeps the card usable when the app didn't register the method
  // it asked to feature — an empty body would be the one outcome worse than
  // the wrong form.
  const resolvedPrimary = allows(primary) ? primary : (offered[0]?.id ?? primary);

  const rest: Provider[] = offered.filter(
    (p) => p.id !== resolvedPrimary && !shownFeatured.includes(p.id),
  );

  const open = (id: string, withPrefill = "") => {
    setPrefill(withPrefill);
    setMethod(id);
  };

  if (method) {
    const provider = byId(method);
    const Panel = PANELS[method];
    return (
      <Shell>
        <VStack alignment="leading" spacing={8}>
          <Button variant="ghost" className="-ml-1" onClick={() => setMethod(null)}>
            ← All sign-in options
          </Button>
          <Heading>{provider.label}</Heading>
        </VStack>
        {needsSetup(method) && <SetupHint id={method} />}
        <Panel prefill={prefill} />
      </Shell>
    );
  }

  const PrimaryPanel = PANELS[resolvedPrimary] ?? EmailPasswordPanel;

  return (
    <Shell>
      <VStack alignment="leading" spacing={4}>
        {logo && <div className="mb-2">{logo}</div>}
        <Heading>{title ?? `Welcome to ${appName}`}</Heading>
        <Text color="gray">{subtitle ?? `${offered.length} ways in. Pick one.`}</Text>
      </VStack>

      {notice}

      {blocked && <UnregisteredOrigin origin={app?.origin ?? null} />}

      <RememberedAccounts onNeedsPanel={open} />

      <PrimaryPanel />

      {/* Stretch container: the social buttons are full-width, so this stays a
          flex column rather than a content-hugging VStack. */}
      <div className="flex flex-col gap-2">
        {shownFeatured.map((id) => (
          <SocialButton key={id} id={id} disabled={needsSetup(id)} />
        ))}
      </div>

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
        <Text color="gray" align="center">
          {footer}
        </Text>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    // `m-auto` rather than `items-center`: auto margins collapse to zero when
    // there isn't room, so a card taller than the viewport sits at the top and
    // scrolls instead of overflowing off the top edge where nothing can reach
    // it.
    <div className="flex min-h-screen p-6">
      <Card size="4" className="m-auto w-[420px]">
        <div className="flex flex-col gap-5">{children}</div>
      </Card>
    </div>
  );
}

/**
 * The card saying, before you click anything, that nothing on it can work.
 *
 * An unregistered origin fails identically for every method — the browser
 * blocks the request before it leaves — and the failure has no response body
 * to explain itself. The deployment already knows (`/apps/me` answers from any
 * origin, registered or not), so there is no reason to make someone click a
 * button to find out.
 */
function UnregisteredOrigin({ origin }: { origin: string | null }) {
  const baseURL = useAuthBaseURL();
  const command = `aussieauth apps register --slug <your-app> --origin ${origin ?? "<your-origin>"}`;
  return (
    <Alert.Root color="amber">
      <Alert.Title>This origin isn&rsquo;t registered</Alert.Title>
      <Alert.Description>
        {origin ?? "This app"} can&rsquo;t reach {baseURL || "the deployment"} until it registers.
        Every button below will be blocked by the browser before the request is sent.
      </Alert.Description>
      <Code className="whitespace-pre-wrap break-all">{command}</Code>
    </Alert.Root>
  );
}

function SocialButton({ id, disabled }: { id: string; disabled: boolean }) {
  const authClient = useAuthClient();
  const callbackURL = useCallbackURL();
  const { pending, error, run } = useRunner({ method: id });
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
  return (
    <Text color="amber">
      Set {PROVIDER_ENV_VARS[id] ?? "the provider credentials"} with{" "}
      <code>bunx convex env set</code> to enable this.
      {guide[id] && (
        <>
          {" "}
          <UiLink href={guide[id]}>Walk me through it →</UiLink>
        </>
      )}
    </Text>
  );
}

