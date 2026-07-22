import { useEffect, useRef, useState } from "react";
import { Button, Card, Heading, Separator, Text, TextField, Theme } from "frosted-ui";
import { byId, ctaFor, PROVIDERS, type Provider } from "./auth/providers";

const PRIMARY = "email-password";
const FEATURED = ["google", "apple", "github"];

/** Everything not already given its own slot — nothing is hidden. */
const REST: Provider[] = PROVIDERS.filter((p) => p.id !== PRIMARY && !FEATURED.includes(p.id));

/**
 * Mock sign-in card — featured social on top, the password form in the middle,
 * and the remaining twelve methods listed in full underneath. No network calls
 * anywhere; every method is a mock.
 */
export default function App() {
  const { pending, run } = useMockAuth();

  return (
    <Theme appearance="light" accentColor="indigo" grayColor="slate">
      <div className="flex min-h-screen justify-center">
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
                  <Button
                    key={id}
                    variant="surface"
                    size="3"
                    className="w-full justify-start gap-3"
                  >
                    {/* Fixed-width slot so the labels line up. */}
                    <span className="flex w-5 shrink-0 justify-center">
                      <ProviderMark provider={p} />
                    </span>
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
              <TextField.Input type="email" placeholder="you@example.com" autoComplete="username" />
              <TextField.Input
                type="password"
                placeholder="Password"
                autoComplete="current-password"
              />
              <Button type="submit" variant="classic" size="3" disabled={pending}>
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <OrDivider label="more ways to sign in" />

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

            <Text size="1" color="gray" className="text-center">
              By continuing you agree to the Terms and Privacy Policy.
            </Text>
          </div>
        </Card>
      </div>
    </Theme>
  );
}

/**
 * Renders a provider's mark, or nothing when the method has no real logo.
 * Keeps `{provider.Logo && …}` out of the layout.
 */
function ProviderMark({ provider, size = 18 }: { provider: Provider; size?: number }) {
  if (!provider.Logo) return null;
  return <provider.Logo size={size} />;
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
 * Fake sign-in state. Submitting just spins for a beat and then settles — no
 * network, no Convex call.
 */
function useMockAuth() {
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const run = () => {
    setPending(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPending(false), 900);
  };

  return { pending, run };
}
