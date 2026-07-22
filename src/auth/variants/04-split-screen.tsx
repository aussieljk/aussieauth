import { useState } from "react";
import { Badge, Card, Heading, Separator, Text, Tooltip } from "frosted-ui";
import { byId, ctaFor, PROVIDERS, type Provider } from "../providers";
import { MethodForm } from "../MethodForm";

const FEATURES = [
  "Sixteen methods, one session model",
  "Passkeys and WebAuthn out of the box",
  "Wallet and agent auth without a second stack",
];

/** Small square icon button — the long tail lives in a grid of these. */
function IconTile({
  provider,
  active,
  onClick,
}: {
  provider: Provider;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip content={provider.label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={provider.label}
        className={`flex h-11 items-center justify-center rounded-[var(--radius-3)] border transition-colors ${
          active
            ? "border-[var(--accent-8)] bg-[var(--accent-a3)]"
            : "border-[var(--gray-a5)] hover:bg-[var(--gray-a3)]"
        }`}
      >
        <provider.Logo size={19} />
      </button>
    </Tooltip>
  );
}

/**
 * Variant 4 — marketing panel on the left, auth on the right. The left side
 * carries the brand so the right side can stay a plain, fast form.
 */
export default function SplitScreen() {
  const [activeId, setActiveId] = useState("email-password");
  const provider = byId(activeId);
  const rest = PROVIDERS.filter((p) => p.id !== "email-password");

  return (
    <div className="flex justify-center">
      <Card size="1" className="w-[900px] overflow-hidden p-0">
        <div className="grid min-h-[560px] grid-cols-1 md:grid-cols-2">
          {/* Brand panel */}
          <div className="relative hidden flex-col justify-between overflow-hidden bg-[var(--accent-9)] p-8 md:flex">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/15 blur-2xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-black/15 blur-2xl"
            />

            <div className="relative flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-2)] bg-white/25 text-sm font-semibold text-white">
                A
              </span>
              <Text size="3" weight="bold" className="text-white">
                AussieAuth
              </Text>
            </div>

            <div className="relative flex flex-col gap-5">
              <Heading size="8" className="text-white">
                Every way in, one form.
              </Heading>
              <div className="flex flex-col gap-3">
                {FEATURES.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-xs text-white">
                      ✓
                    </span>
                    <Text size="2" className="text-white/90">
                      {f}
                    </Text>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex flex-wrap gap-2">
              {PROVIDERS.slice(0, 8).map((p) => (
                <span
                  key={p.id}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90"
                >
                  <p.Logo size={16} />
                </span>
              ))}
              <span className="flex h-8 items-center rounded-full bg-white/25 px-3 text-xs font-medium text-white">
                +{PROVIDERS.length - 8}
              </span>
            </div>
          </div>

          {/* Auth panel */}
          <div className="flex flex-col justify-center gap-5 p-8">
            <div className="flex flex-col gap-1">
              <Heading size="6">Sign in</Heading>
              <Text size="2" color="gray">
                New here?{" "}
                <span className="text-[var(--accent-11)] underline">
                  Create an account
                </span>
              </Text>
            </div>

            <div className="flex items-center gap-2">
              <provider.Logo size={16} />
              <Text size="2" weight="medium">
                {provider.label}
              </Text>
              <Badge size="1" color="gray" className="ml-auto">
                {provider.category}
              </Badge>
            </div>

            <MethodForm provider={provider} size="3" />

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <Text size="1" color="gray">
                or pick another method
              </Text>
              <Separator className="flex-1" />
            </div>

            <div className="grid grid-cols-5 gap-2">
              {rest.map((p) => (
                <IconTile
                  key={p.id}
                  provider={p}
                  active={p.id === activeId}
                  onClick={() => setActiveId(p.id)}
                />
              ))}
              <IconTile
                provider={byId("email-password")}
                active={activeId === "email-password"}
                onClick={() => setActiveId("email-password")}
              />
            </div>

            <Text size="1" color="gray">
              Currently showing: {ctaFor(provider)}
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
}
