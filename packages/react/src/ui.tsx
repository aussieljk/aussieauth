import { Alert, Button, HStack, IconButton, Input, Spinner, Tooltip, Typography } from "ljkui";
import { Icons, type IconProps } from "ljkui/icons";
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

/**
 * Fills the viewport while a gated route waits on `useConvexAuth` to settle.
 * `/account` used to render `null` here — a blank screen for the whole beat it
 * takes the cross-domain session to exchange after an OAuth return, which read
 * as the page having frozen. A spinner says the same "not ready" without the
 * dead air.
 */
export function RouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size="3" />
    </div>
  );
}

/**
 * Covers the sign-in card the instant a social button is clicked, so the screen
 * visibly hands off to the provider rather than sitting unchanged for the
 * round-trip it takes Better Auth to fetch the OAuth URL before it can redirect.
 * Stays up until the browser navigates away; the caller pulls it back down only
 * if the sign-in call comes back with an error instead.
 */
export function RedirectOverlay({ label, icon }: { label: string; icon?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4">
      {icon}
      <HStack spacing={8}>
        <Spinner size="3" />
        <Text color="gray">Taking you to {label}…</Text>
      </HStack>
    </div>
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
