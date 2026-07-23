import { Alert, Button, IconButton, Input, Tooltip, Typography } from "@aussieljk/frosted";
import { Icons, type IconProps } from "@aussieljk/frosted/icons";
import type { ComponentProps, ComponentType, ReactNode } from "react";

const { Text } = Typography;

/** A labelled text input. Everything else is a plain `<input>` prop. */
export function Field({
  label,
  ...props
}: { label: string } & ComponentProps<typeof Input.Control>) {
  return (
    <label className="flex flex-col gap-1.5">
      <Text color="gray" weight="medium">
        {label}
      </Text>
      <Input.Control {...props} />
    </label>
  );
}

/**
 * A bare six-digit code input, for where a label would cost more room than it
 * earns. `autoComplete="one-time-code"` is what lets iOS Passwords and Android
 * SMS Retriever offer the code above the keyboard.
 */
export function CodeInput(props: ComponentProps<typeof Input.Control>) {
  return (
    <Input.Control
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
export function CodeField(props: ComponentProps<typeof Input.Control>) {
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
    <Alert.Root color={error ? "red" : "green"}>
      <Alert.Description>{error ?? notice}</Alert.Description>
    </Alert.Root>
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

/**
 * The control that takes something away: unlinking a provider, revoking a key,
 * forgetting an account. Every one of these lives at the end of a list row, so
 * the label goes in a tooltip and the button carries a danger fill instead — a
 * word of prose there would compete with the thing being acted on, and a ghost
 * button would leave the one irreversible control the quietest on screen.
 */
export function Destructive({
  label,
  icon: Icon = Icons.Trash,
  disabled,
  onClick,
}: {
  label: string;
  icon?: ComponentType<IconProps>;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip content={label}>
      <IconButton
        variant="soft"
        color="danger"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
      >
        <Icon size={16} />
      </IconButton>
    </Tooltip>
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
