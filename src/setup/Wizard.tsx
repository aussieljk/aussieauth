import { Badge, Button, Card, Spinner, Tooltip, Typography } from "@aussieljk/frosted";
import { Icons } from "@aussieljk/frosted/icons";
import { type ReactNode, useState } from "react";
import { useSetupStatus } from "@aussieljk/auth";

const { Heading, Text } = Typography;

/**
 * The shared parts of the Google and Apple walkthroughs.
 *
 * Both consoles are a sequence of screens where one wrong identifier fails much
 * later and says nothing useful. So the wizard's job isn't prose — the docs have
 * that — it's handing over the exact strings to paste, and then asking the
 * server whether the credentials actually landed.
 */

export function Wizard({
  title,
  intro,
  children,
}: {
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="max-w-3xl">
      <Heading className="text-3xl">{title}</Heading>
      <Text color="gray" className="mt-2 block">
        {intro}
      </Text>
      <ol className="mt-8 flex flex-col gap-4">{children}</ol>
    </div>
  );
}

export function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li>
      <Card>
        <div className="flex gap-4">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--gray-a6)] text-[13px] tabular-nums">
            {n}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Heading className="text-lg">{title}</Heading>
            {children}
          </div>
        </div>
      </Card>
    </li>
  );
}

/** Body copy inside a step. Steps are dense enough without a wrapper per line. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <Text color="gray" className="block">
      {children}
    </Text>
  );
}

/** The one thing in a step you'd otherwise mistype. */
export function Copyable({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Text weight="medium">{label}</Text>
      <div className="flex items-stretch gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-md border border-[var(--gray-a4)] bg-[var(--gray-2)] px-3 py-2 text-[12.5px] leading-relaxed">
          {value}
        </code>
        <CopyButton value={value} label={label} />
      </div>
      {hint && <Text color="gray">{hint}</Text>}
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip content={copied ? "Copied" : `Copy ${label.toLowerCase()}`}>
      <Button
        variant="surface"
        aria-label={`Copy ${label.toLowerCase()}`}
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? <Icons.Check size={15} /> : <Icons.Copy size={15} />}
      </Button>
    </Tooltip>
  );
}

/**
 * The last step of every wizard: ask the deployment whether it can see the
 * credentials now. The same probe drives the "needs setup" badges on the
 * sign-in card, so a green tick here and a working button there can't disagree.
 */
export function VerifyStep({
  n,
  method,
  label,
  children,
}: {
  n: number;
  /** Key in the status probe's response — "google", "apple", … */
  method: string;
  label: string;
  children?: ReactNode;
}) {
  const { setup, refetch } = useSetupStatus(true);
  const [checking, setChecking] = useState(false);
  const ready = setup?.[method];

  return (
    <Step n={n} title={`Check ${label} is live`}>
      {children}
      <Note>
        Environment variables take a moment to propagate after <code>convex env set</code>. This
        asks the deployment directly.
      </Note>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="classic"
          disabled={checking}
          onClick={() => {
            setChecking(true);
            void refetch().finally(() => setChecking(false));
          }}
        >
          {checking ? "Checking…" : "Check now"}
        </Button>
        {checking && <Spinner />}
        {!checking && ready === true && <Badge color="green">{label} is configured</Badge>}
        {!checking && ready === false && (
          <Badge color="amber">Not visible to the deployment yet</Badge>
        )}
      </div>
    </Step>
  );
}
