import { Button, Typography } from "@aussieljk/frosted";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { PENDING_ACCOUNT_NUMBER } from "@/lib/storage";
import { signWithWallet } from "@/lib/wallet";
import { byId, ctaFor } from "./providers";
import { useRunner } from "./useRunner";
import { BigButton, CodeField, Feedback, Field, PanelForm, Submit } from "./ui";

const { Code, Text } = Typography;

/**
 * One panel per sign-in method. Each drives the auth client directly, so
 * adding a method is: register the Better Auth plugin, add a row to
 * `providers.ts`, and add an entry here.
 */

const callbackURL = () => window.location.origin;

function Mark({ id }: { id: string }) {
  const { Logo } = byId(id);
  return Logo ? <Logo size={18} /> : null;
}

/** Social providers and the other true one-click methods. */
function OneClick({ id, action }: { id: string; action: () => Promise<unknown> }) {
  const { pending, error, run } = useRunner();
  const provider = byId(id);
  return (
    <div className="flex flex-col gap-3">
      <Text color="gray">{provider.hint}</Text>
      <BigButton pending={pending} icon={<Mark id={id} />} onClick={() => void run(action)}>
        {ctaFor(provider)}
      </BigButton>
      <Feedback error={error} />
    </div>
  );
}

const social = (provider: "google" | "github" | "apple") => () =>
  authClient.signIn.social({ provider, callbackURL: callbackURL() });

export function GooglePanel() {
  return <OneClick id="google" action={social("google")} />;
}
export function GitHubPanel() {
  return <OneClick id="github" action={social("github")} />;
}
export function ApplePanel() {
  return <OneClick id="apple" action={social("apple")} />;
}
export function OneTapPanel() {
  return <OneClick id="google-one-tap" action={() => authClient.oneTap()} />;
}
export function DemoPanel() {
  return <OneClick id="demo" action={() => authClient.signIn.demo()} />;
}
export function AnonymousPanel() {
  return <OneClick id="anonymous" action={() => authClient.signIn.anonymous()} />;
}
export function PasskeyPanel() {
  return <OneClick id="passkey" action={() => authClient.signIn.passkey()} />;
}

export function SolanaPanel() {
  return (
    <OneClick
      id="solana"
      action={async () => {
        // The server composes the message and remembers it, so the wallet
        // signs exactly the challenge we'll verify against.
        const { address, signature } = await signWithWallet(async (address) => {
          const { data, error } = await authClient.solana.challenge({
            address,
          });
          if (error) throw new Error(error.message || "Couldn't start the wallet challenge");
          return data.message;
        });
        return authClient.signIn.solana({ address, signature });
      }}
    />
  );
}

/**
 * A method that starts from an address or handle. The sign-in screen passes
 * one when a returning account's saved session has lapsed, so you land on the
 * form already knowing who you are.
 */
export type PanelProps = { prefill?: string };

/** Email + password, with a create-account mode. */
export function EmailPasswordPanel({ prefill = "" }: PanelProps) {
  const { pending, error, notice, run } = useRunner();
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState(prefill);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <PanelForm
        onSubmit={() =>
          void run(() =>
            creating
              ? authClient.signUp.email({
                  email,
                  password,
                  name: name || email,
                })
              : authClient.signIn.email({ email, password }),
          )
        }
      >
        {creating && (
          <Field
            label="Name"
            value={name}
            autoComplete="name"
            placeholder="Lucas"
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <Field
          label="Email"
          type="email"
          required
          value={email}
          autoComplete="username"
          placeholder="you@example.com"
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          required
          value={password}
          autoComplete={creating ? "new-password" : "current-password"}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Submit pending={pending}>{creating ? "Create account" : "Sign in"}</Submit>
      </PanelForm>
      <Feedback error={error} notice={notice} />
      <Button variant="ghost" onClick={() => setCreating(!creating)}>
        {creating ? "I already have an account" : "Create an account instead"}
      </Button>
    </div>
  );
}

export function UsernamePasswordPanel({ prefill = "" }: PanelProps) {
  const { pending, error, run } = useRunner();
  const [creating, setCreating] = useState(false);
  const [username, setUsername] = useState(prefill);
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <PanelForm
        onSubmit={() =>
          void run(() =>
            creating
              ? authClient.signUp.email({
                  email,
                  password,
                  username,
                  name: username,
                })
              : authClient.signIn.username({ username, password }),
          )
        }
      >
        <Field
          label="Username"
          required
          value={username}
          autoComplete="username"
          placeholder="lucas"
          onChange={(e) => setUsername(e.target.value)}
        />
        {creating && (
          <Field
            label="Email"
            type="email"
            required
            value={email}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        <Field
          label="Password"
          type="password"
          required
          value={password}
          autoComplete={creating ? "new-password" : "current-password"}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Submit pending={pending}>{creating ? "Create account" : "Sign in"}</Submit>
      </PanelForm>
      <Feedback error={error} />
      <Button variant="ghost" onClick={() => setCreating(!creating)}>
        {creating ? "I already have an account" : "Create an account instead"}
      </Button>
    </div>
  );
}

export function PhonePasswordPanel({ prefill = "" }: PanelProps) {
  const { pending, error, run } = useRunner();
  const [phone, setPhone] = useState(prefill);
  const [password, setPassword] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <PanelForm
        onSubmit={() =>
          void run(() => authClient.signIn.phoneNumber({ phoneNumber: phone, password }))
        }
      >
        <Field
          label="Phone number"
          type="tel"
          required
          value={phone}
          autoComplete="tel"
          placeholder="+61 400 000 000"
          onChange={(e) => setPhone(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          required
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <Submit pending={pending}>Sign in</Submit>
      </PanelForm>
      <Feedback error={error} />
      <Text color="gray">
        No account yet? Sign in with an SMS code first, then set a password from your account page.
      </Text>
    </div>
  );
}

export function MagicLinkPanel({ prefill = "" }: PanelProps) {
  const { pending, error, notice, run } = useRunner();
  const [email, setEmail] = useState(prefill);

  return (
    <div className="flex flex-col gap-3">
      <PanelForm
        onSubmit={() =>
          void run(
            () =>
              authClient.signIn.magicLink({
                email,
                callbackURL: callbackURL(),
              }),
            `Link sent to ${email}. It's good for one sign-in.`,
          )
        }
      >
        <Field
          label="Email"
          type="email"
          required
          value={email}
          autoComplete="username"
          placeholder="you@example.com"
          onChange={(e) => setEmail(e.target.value)}
        />
        <Submit pending={pending}>Email me a link</Submit>
      </PanelForm>
      <Feedback error={error} notice={notice} />
    </div>
  );
}

/**
 * Two-step code flows. Email OTP and SMS OTP differ only in which endpoints
 * they call and what they ask for, so they share this shell.
 */
function OtpPanel({
  label,
  placeholder,
  autoComplete,
  type,
  prefill,
  send,
  verify,
}: {
  label: string;
  placeholder: string;
  autoComplete: string;
  type: string;
  prefill?: string;
  send: (identity: string) => Promise<unknown>;
  verify: (identity: string, code: string) => Promise<unknown>;
}) {
  const { pending, error, notice, run } = useRunner();
  const [identity, setIdentity] = useState(prefill ?? "");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);

  if (!sent) {
    return (
      <div className="flex flex-col gap-3">
        <PanelForm
          onSubmit={() =>
            void run(() => send(identity)).then((ok) => {
              if (ok) setSent(true);
            })
          }
        >
          <Field
            label={label}
            type={type}
            required
            value={identity}
            autoComplete={autoComplete}
            placeholder={placeholder}
            onChange={(e) => setIdentity(e.target.value)}
          />
          <Submit pending={pending}>Send code</Submit>
        </PanelForm>
        <Feedback error={error} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <PanelForm onSubmit={() => void run(() => verify(identity, code))}>
        <CodeField value={code} required onChange={(e) => setCode(e.target.value)} />
        <Submit pending={pending}>Verify and sign in</Submit>
      </PanelForm>
      <Feedback error={error} notice={notice ?? `Code sent to ${identity}.`} />
      <Button variant="ghost" onClick={() => setSent(false)}>
        Use a different {label.toLowerCase()}
      </Button>
    </div>
  );
}

export function EmailOtpPanel({ prefill }: PanelProps) {
  return (
    <OtpPanel
      label="Email"
      type="email"
      autoComplete="username"
      placeholder="you@example.com"
      prefill={prefill}
      send={(email) => authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" })}
      verify={(email, otp) => authClient.signIn.emailOtp({ email, otp })}
    />
  );
}

export function SmsOtpPanel({ prefill }: PanelProps) {
  return (
    <OtpPanel
      label="Phone number"
      type="tel"
      autoComplete="tel"
      placeholder="+61 400 000 000"
      prefill={prefill}
      send={(phoneNumber) => authClient.phoneNumber.sendOtp({ phoneNumber })}
      verify={(phoneNumber, code) => authClient.phoneNumber.verify({ phoneNumber, code })}
    />
  );
}

export function AccountNumberPanel() {
  const { pending, error, run } = useRunner();
  const [number, setNumber] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <PanelForm
        onSubmit={() => void run(() => authClient.signIn.accountNumber({ accountNumber: number }))}
      >
        <Field
          label="Account number"
          required
          inputMode="numeric"
          value={number}
          placeholder="1234 5678 9012 3456"
          onChange={(e) => setNumber(e.target.value)}
        />
        <Submit pending={pending}>Sign in</Submit>
      </PanelForm>
      <Feedback error={error} />
      <div className="flex flex-col gap-2 border-t border-[var(--gray-a5)] pt-4">
        <Text color="gray">
          No email, no password, no recovery — the number is the whole account.
        </Text>
        <Button
          variant="surface"
          disabled={pending}
          onClick={() =>
            void run(async () => {
              const { data, error } = await authClient.signUp.accountNumber();
              if (error) return { error };
              // Read once on the account page, then cleared.
              localStorage.setItem(PENDING_ACCOUNT_NUMBER, data.accountNumber);
            })
          }
        >
          Generate an account
        </Button>
      </div>
    </div>
  );
}

export function AgentPanel() {
  return (
    <div className="flex flex-col gap-3">
      <Text color="gray">
        Agents authenticate with an API key sent as an <Code>x-api-key</Code> header — there's no
        interactive sign-in. Sign in as yourself, then mint a key from your account page and hand it
        to the agent.
      </Text>
    </div>
  );
}
