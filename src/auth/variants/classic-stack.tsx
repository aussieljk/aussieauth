import { Button, Card, Heading, Separator, Text } from "frosted-ui";
import { byId, ctaFor, PROVIDERS, ProviderMark, type Provider } from "../providers";
import { MethodFields, useMockAuth } from "../MethodForm";

const FEATURED = ["google", "apple", "github"];
const PRIMARY = "email-password";

/** Everything not already given its own slot above — nothing is hidden. */
const REST: Provider[] = PROVIDERS.filter(
  (p) => !FEATURED.includes(p.id) && p.id !== PRIMARY,
);

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
 * Baseline — featured social on top, the password form in the middle, and the
 * remaining twelve methods listed in full underneath.
 */
export default function ClassicStack() {
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
                <Button
                  key={id}
                  variant="surface"
                  size="3"
                  className="w-full justify-start gap-3"
                >
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
            <Button
              type="submit"
              variant="classic"
              size="3"
              disabled={status === "pending"}
            >
              {status === "pending" ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <OrDivider label="more ways to sign in" />

          <div className="flex flex-col gap-1">
            {REST.map((p) => (
              <Button
                key={p.id}
                variant="ghost"
                color="gray"
                size="2"
                className="w-full justify-start gap-3"
              >
                <MarkSlot provider={p} />
                <span>{ctaFor(p)}</span>
              </Button>
            ))}
          </div>

          <Text size="1" color="gray" className="text-center">
            By continuing you agree to the Terms and Privacy Policy.
          </Text>
        </div>
      </Card>
    </div>
  );
}
