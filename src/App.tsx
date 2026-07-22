import { useEffect, useRef, useState } from "react";
import { Button, Card, Heading, OTPField, Separator, Text, TextField, Theme } from "frosted-ui";
import { byId, ctaFor, PROVIDERS, type Provider } from "./auth/providers";

const PRIMARY = "email-password";
const FEATURED = ["google", "apple", "github"];

/** Everything not already given its own slot — nothing is hidden. */
const REST: Provider[] = PROVIDERS.filter((p) => p.id !== PRIMARY && !FEATURED.includes(p.id));

/**
 * Both surviving auth mocks side by side, so the two treatments can be compared
 * directly. No network calls anywhere — every method is a mock.
 */
export default function App() {
  const [appearance, setAppearance] = useState<"light" | "dark">("light");

  return (
    <Theme appearance={appearance} accentColor="indigo" grayColor="slate">
      <div className="min-h-screen">
        <ClassicStack />
      </div>
    </Theme>
  );
}

/**
 * Baseline — featured social on top, the password form in the middle, and the
 * remaining twelve methods listed in full underneath.
 */
function ClassicStack() {
  const email = byId(PRIMARY);
  const { status, run } = useMockAuth();

  return (
    <div className="flex justify-center">
      <Card size="4" className="w-[420px]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <Heading size="6">Welcome back</Heading>
            <Text size="2" color="gray">
              Sign in to AussieAuth to continue.
            </Text>
          </div>

          <div className="flex flex-col gap-2">
            {FEATURED.map((id) => {
              const p = byId(id);
              return (
                <Button key={id} variant="surface" size="3" className="w-full justify-start gap-3">
                  <MarkSlot provider={p} />
                  <span>{ctaFor(p)}</span>
                </Button>
              );
            })}
          </div>

          <OrDivider label="or continue with email" />

          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              run();
            }}
          >
            <MethodFields provider={email} />
            <Button type="submit" variant="classic" size="3" disabled={status === "pending"}>
              {status === "pending" ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <OrDivider label="more ways to sign in" />

          <div className="flex flex-col gap-2">
            <Text size="1" color="gray">
              Or use
            </Text>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {REST.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex items-center gap-1.5 text-[13px] text-[var(--gray-11)] underline decoration-[var(--gray-a6)] underline-offset-4 transition-colors hover:text-[var(--gray-12)]"
                >
                  <ProviderMark provider={p} size={13} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <Text size="1" color="gray" className="text-center">
            By continuing you agree to the Terms and Privacy Policy.
          </Text>
        </div>
      </Card>
    </div>
  );
}

/**
 * Renders a provider's mark, or nothing when the method has no real logo.
 * Keeps `{provider.Logo && …}` out of every layout.
 */
function ProviderMark({ provider, size = 18 }: { provider: Provider; size?: number }) {
  if (!provider.Logo) return null;
  return <provider.Logo size={size} />;
}

/**
 * Fixed-width mark slot so labels line up whether or not the method has a logo.
 */
function MarkSlot({ provider }: { provider: Provider }) {
  return (
    <span className="flex w-5 shrink-0 justify-center">
      <ProviderMark provider={provider} size={18} />
    </span>
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

/**
 * The input rows a given method needs — no submit button, so callers can place
 * their own CTA wherever the layout wants it.
 */
function MethodFields({ provider }: { provider: Provider }) {
  switch (provider.form) {
    case "none":
      return null;

    case "email-password":
      return (
        <>
          <TextField.Input type="email" placeholder="you@example.com" autoComplete="username" />
          <TextField.Input type="password" placeholder="Password" autoComplete="current-password" />
        </>
      );

    case "phone-password":
      return (
        <>
          <TextField.Input type="tel" placeholder="+61 4XX XXX XXX" autoComplete="tel" />
          <TextField.Input type="password" placeholder="Password" autoComplete="current-password" />
        </>
      );

    case "username-password":
      return (
        <>
          <TextField.Input placeholder="Username" autoComplete="username" />
          <TextField.Input type="password" placeholder="Password" autoComplete="current-password" />
        </>
      );

    case "email-only":
      return <TextField.Input type="email" placeholder="you@example.com" autoComplete="email" />;

    case "otp":
      return (
        <div className="flex flex-col gap-3">
          {provider.id === "email-otp" && (
            <TextField.Input type="email" placeholder="you@example.com" autoComplete="email" />
          )}
          <OtpInput />
          <Text size="1" color="gray">
            {provider.id === "ios-otp"
              ? "Codes autofill from the iOS Passwords app."
              : "Enter the six-digit code we emailed you."}
          </Text>
        </div>
      );

    case "token":
      return (
        <div className="flex flex-col gap-2">
          <TextField.Input
            placeholder={
              provider.id === "agent" ? "agt_live_••••••••••••••••" : "1234 5678 9012 3456"
            }
            className="font-mono"
          />
          <Text size="1" color="gray">
            {provider.id === "agent"
              ? "Scoped, revocable, and never shared with the end user."
              : "No email, no username. Save this number — it is your login."}
          </Text>
        </div>
      );
  }
}

/** A six-slot OTP input wired to local state. */
function OtpInput() {
  const [value, setValue] = useState("");
  return (
    <OTPField.Root
      maxLength={6}
      value={value}
      onChange={setValue}
      // iOS surfaces the code from the Passwords app through this token.
      autoComplete="one-time-code"
      render={({ slots }) => (
        <OTPField.Group>
          {slots.map((slot, i) => (
            <OTPField.Slot key={i} {...slot} />
          ))}
        </OTPField.Group>
      )}
    />
  );
}

/**
 * Fake sign-in state. Every variant is a mock, so "submitting" just spins for a
 * beat and then reports success — no network, no Convex call.
 */
function useMockAuth() {
  const [status, setStatus] = useState<"idle" | "pending" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const run = () => {
    setStatus("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("done"), 900);
  };

  return { status, run };
}
