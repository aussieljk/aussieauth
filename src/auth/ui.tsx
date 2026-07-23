import { Button, Callout, Text, TextField } from "@aussieljk/frosted";
import type { ComponentProps, ReactNode } from "react";

/** A labelled text input. Everything else is a plain `<input>` prop. */
export function Field({
  label,
  ...props
}: { label: string } & ComponentProps<typeof TextField.Input>) {
  return (
    <label className="flex flex-col gap-1.5">
      <Text color="gray" weight="medium">
        {label}
      </Text>
      <TextField.Input {...props} />
    </label>
  );
}

/**
 * A bare six-digit code input, for where a label would cost more room than it
 * earns. `autoComplete="one-time-code"` is what lets iOS Passwords and Android
 * SMS Retriever offer the code above the keyboard.
 */
export function CodeInput(props: ComponentProps<typeof TextField.Input>) {
  return (
    <TextField.Input
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={6}
      placeholder="123456"
      {...props}
    />
  );
}

/** The same input, labelled, for the sign-in panels. */
export function CodeField(props: ComponentProps<typeof TextField.Input>) {
  return (
    <label className="flex flex-col gap-1.5">
      <Text color="gray" weight="medium">
        Verification code
      </Text>
      <CodeInput {...props} />
    </label>
  );
}

export function Feedback({ error, notice }: { error?: string | null; notice?: string | null }) {
  if (!error && !notice) return null;
  return (
    <Callout.Root color={error ? "red" : "green"}>
      <Callout.Description>{error ?? notice}</Callout.Description>
    </Callout.Root>
  );
}

export function Submit({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <Button type="submit" variant="classic" disabled={pending}>
      {pending ? "Working…" : children}
    </Button>
  );
}

/** A full-width one-click method (social buttons, demo, anonymous). */
export function BigButton({
  onClick,
  pending,
  icon,
  children,
}: {
  onClick: () => void;
  pending?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Button
      variant="surface"
      className="w-full justify-start gap-3"
      disabled={pending}
      onClick={onClick}
    >
      {/* Fixed-width slot so labels line up whether or not there's a mark. */}
      <span className="flex w-5 shrink-0 justify-center">{icon}</span>
      <span>{children}</span>
    </Button>
  );
}

export function PanelForm({ onSubmit, children }: { onSubmit: () => void; children: ReactNode }) {
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}
