import { Button, Heading, Text } from "frosted-ui";
import { byId, PROVIDERS, ProviderMark, type Provider } from "../providers";
import { MethodFields, useMockAuth } from "../MethodForm";

const PRIMARY = "email-password";
const FEATURED = ["google", "apple", "github"];
const REST: Provider[] = PROVIDERS.filter(
  (p) => p.id !== PRIMARY && !FEATURED.includes(p.id),
);

/**
 * Chrome-free variation — no card, no borders, minimal weight. The long tail
 * becomes a wrapped run of text links rather than a stack of buttons, which
 * keeps all sixteen on screen without dominating the page.
 */
export default function Quiet() {
  const email = byId(PRIMARY);
  const { status, run } = useMockAuth();

  return (
    <div className="mx-auto flex w-[380px] flex-col gap-7 pt-6">
      <div className="flex flex-col gap-2">
        <Heading size="8" weight="light">
          Sign in
        </Heading>
        <Text size="2" color="gray">
          to AussieAuth
        </Text>
      </div>

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
          {status === "pending" ? "Signing in…" : "Continue"}
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        {FEATURED.map((id) => {
          const p = byId(id);
          return (
            <Button
              key={id}
              variant="ghost"
              color="gray"
              size="2"
              className="w-full justify-start gap-3"
            >
              <span className="flex w-5 shrink-0 justify-center">
                <ProviderMark provider={p} size={17} />
              </span>
              <span>Continue with {p.label}</span>
            </Button>
          );
        })}
      </div>

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
    </div>
  );
}
