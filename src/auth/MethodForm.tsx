import { useEffect, useRef, useState } from "react";
import { Button, Callout, OTPField, Spinner, Text, TextField } from "frosted-ui";
import { ctaFor, ProviderMark, type Provider } from "./providers";

/**
 * Fake sign-in state. Every variant is a mock, so "submitting" just spins for a
 * beat and then reports success — no network, no Convex call.
 */
export function useMockAuth() {
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

  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    setStatus("idle");
  };

  return { status, run, reset };
}

/** A six-slot OTP input wired to local state. */
export function OtpInput({ size = "2" }: { size?: "1" | "2" | "3" }) {
  const [value, setValue] = useState("");
  return (
    <OTPField.Root
      maxLength={6}
      value={value}
      onChange={setValue}
      // iOS surfaces the code from the Passwords app through this token.
      autoComplete="one-time-code"
      render={({ slots }) => (
        <OTPField.Group data-size={size}>
          {slots.map((slot, i) => (
            <OTPField.Slot key={i} {...slot} />
          ))}
        </OTPField.Group>
      )}
    />
  );
}

/**
 * The input rows a given method needs — no submit button, so callers can place
 * their own CTA wherever the layout wants it.
 */
export function MethodFields({ provider }: { provider: Provider }) {
  switch (provider.form) {
    case "none":
      return null;

    case "email-password":
      return (
        <>
          <TextField.Input
            type="email"
            placeholder="you@example.com"
            autoComplete="username"
          />
          <TextField.Input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
          />
        </>
      );

    case "phone-password":
      return (
        <>
          <TextField.Input
            type="tel"
            placeholder="+61 4XX XXX XXX"
            autoComplete="tel"
          />
          <TextField.Input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
          />
        </>
      );

    case "username-password":
      return (
        <>
          <TextField.Input placeholder="Username" autoComplete="username" />
          <TextField.Input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
          />
        </>
      );

    case "email-only":
      return (
        <TextField.Input
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
        />
      );

    case "otp":
      return (
        <div className="flex flex-col gap-3">
          {provider.id === "email-otp" && (
            <TextField.Input
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
            />
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
              provider.id === "agent"
                ? "agt_live_••••••••••••••••"
                : "1234 5678 9012 3456"
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

/** Fields plus a CTA and mock success state — the default single-method panel. */
export function MethodForm({
  provider,
  size = "2",
}: {
  provider: Provider;
  size?: "1" | "2" | "3" | "4";
}) {
  const { status, run } = useMockAuth();
  const hasFields = provider.form !== "none";

  if (status === "done") {
    return (
      <Callout.Root color="green">
        <Callout.Description>
          Signed in with {provider.label} — this is a mock, nothing was sent.
        </Callout.Description>
      </Callout.Root>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        run();
      }}
    >
      {hasFields && <MethodFields provider={provider} />}
      {/* frosted-ui buttons wrap Base UI, which defaults to type="button" —
          without this the form never submits. */}
      <Button type="submit" variant="classic" size={size} disabled={status === "pending"}>
        {status === "pending" ? <Spinner /> : <ProviderMark provider={provider} size={16} />}
        {ctaFor(provider)}
      </Button>
    </form>
  );
}
