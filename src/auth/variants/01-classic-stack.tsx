import { useState } from "react";
import { Button, Card, Heading, Separator, Text } from "frosted-ui";
import { byId, ctaFor, type Provider } from "../providers";
import { MethodFields, useMockAuth } from "../MethodForm";

const PRIMARY_SOCIAL = ["google", "apple", "github"];
const QUICK = ["passkey", "magic-link", "email-otp"];
const MORE = [
  "google-one-tap",
  "solana",
  "phone-password",
  "username-password",
  "ios-otp",
  "demo",
  "anonymous",
  "account-number",
  "agent",
];

/** Full-width provider button with the mark pinned left of the label. */
function ProviderButton({ provider }: { provider: Provider }) {
  return (
    <Button variant="surface" size="3" className="w-full justify-start gap-3">
      <provider.Logo size={18} />
      <span>{ctaFor(provider)}</span>
    </Button>
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
 * Variant 1 — the conventional stack everyone recognises: social on top, the
 * password form in the middle, and the long tail folded away behind a toggle.
 */
export default function ClassicStack() {
  const [showMore, setShowMore] = useState(false);
  const email = byId("email-password");
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
            {PRIMARY_SOCIAL.map((id) => (
              <ProviderButton key={id} provider={byId(id)} />
            ))}
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

          <div className="grid grid-cols-3 gap-2">
            {QUICK.map((id) => {
              const p = byId(id);
              return (
                <Button
                  key={id}
                  variant="soft"
                  color="gray"
                  size="2"
                  className="flex-col gap-1 py-3 h-auto"
                >
                  <p.Logo size={18} />
                  <Text size="1">{p.short}</Text>
                </Button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="text-sm text-[var(--gray-11)] underline self-center"
              onClick={() => setShowMore(!showMore)}
            >
              {showMore
                ? "Fewer options"
                : `More ways to sign in (${MORE.length})`}
            </button>

            {showMore && (
              <div className="grid grid-cols-2 gap-2">
                {MORE.map((id) => {
                  const p = byId(id);
                  return (
                    <Button
                      key={id}
                      variant="ghost"
                      color="gray"
                      size="2"
                      className="justify-start gap-2"
                    >
                      <p.Logo size={16} />
                      <Text size="1" className="truncate">
                        {p.short}
                      </Text>
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          <Text size="1" color="gray" className="text-center">
            By continuing you agree to the Terms and Privacy Policy.
          </Text>
        </div>
      </Card>
    </div>
  );
}
