import { Badge, Button, Card, Input, Typography } from "@aussieljk/frosted";
import { Icons } from "@aussieljk/frosted/icons";
import { type ReactNode, useCallback, useState } from "react";
import {
  authClient,
  callbackURL,
  CodeInput,
  Destructive,
  Feedback,
  useRemoteList,
  useRunner,
} from "@aussieljk/auth";
import { signWithWallet } from "@aussieljk/auth/solana";

const { Code, Heading, Text } = Typography;

/**
 * Everything that can get you into *this* account, one row each. Adding a
 * method here links it to the user you're already signed in as, rather than
 * minting a second account — the same address arriving by a different door.
 */

type Account = { id: string; providerId: string; accountId: string };
type Wallet = { address: string };

const listAccounts = () => authClient.listAccounts();
const listWallets = () => authClient.solana.list();

const SOCIAL = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
  { id: "apple", label: "Apple" },
] as const;

export function SignInMethods({
  user,
  locked = false,
}: {
  user: {
    email: string;
    username?: string | null;
    phoneNumber?: string | null;
    twoFactorEnabled?: boolean | null;
  } | null;
  /** The shared demo account: the server refuses all of these, so grey them. */
  locked?: boolean;
}) {
  const { items: accounts, reload } = useRemoteList<Account>(listAccounts);
  const hasPassword = accounts.some((a) => a.providerId === "credential");
  // One form open at a time, so adding a method can't push the rest off-screen.
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => setOpen((current) => (current === id ? null : id));

  return (
    <Card>
      <div className="flex flex-col gap-2.5">
        <Heading>Sign-in methods</Heading>
        <Social accounts={accounts} reload={reload} locked={locked} />
        <Password
          hasPassword={hasPassword}
          reload={reload}
          locked={locked}
          open={open === "password"}
          onToggle={() => toggle("password")}
        />
        <Username
          current={user?.username}
          locked={locked}
          open={open === "username"}
          onToggle={() => toggle("username")}
        />
        <Phone
          current={user?.phoneNumber}
          locked={locked}
          open={open === "phone"}
          onToggle={() => toggle("phone")}
        />
        <TwoFactor
          enabled={Boolean(user?.twoFactorEnabled)}
          hasPassword={hasPassword}
          locked={locked}
          open={open === "two-factor"}
          onToggle={() => toggle("two-factor")}
        />
        <Wallets locked={locked} />
      </div>
    </Card>
  );
}

/**
 * One credential: what it is, where it stands, and the control that changes
 * it. Anything longer — a form, a list of linked wallets — opens underneath,
 * so the resting state of the card is one line per method.
 */
function Row({
  label,
  status,
  action,
  children,
}: {
  label: string;
  status?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-[var(--gray-a3)] pt-2.5 first:border-0 first:pt-0">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Text>{label}</Text>
          {status}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const Linked = () => <Badge color="green">linked</Badge>;

/** The form behind a row's control: one field, one button, one line. */
function InlineForm({ onSubmit, children }: { onSubmit: () => void; children: ReactNode }) {
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}

function Social({
  accounts,
  reload,
  locked,
}: {
  accounts: Account[];
  reload: () => void;
  locked: boolean;
}) {
  const { pending, error, run } = useRunner();
  const busy = pending || locked;

  return (
    <>
      {SOCIAL.map(({ id, label }) => {
        const account = accounts.find((a) => a.providerId === id);
        return (
          <Row
            key={id}
            label={label}
            status={account ? <Linked /> : undefined}
            action={
              account ? (
                <Destructive
                  label={`Unlink ${label}`}
                  icon={Icons.Close}
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      authClient.unlinkAccount({
                        providerId: id,
                        accountId: account.accountId,
                      }),
                    ).then(reload)
                  }
                />
              ) : (
                <Button
                  variant="surface"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      authClient.linkSocial({
                        provider: id,
                        callbackURL: callbackURL(),
                      }),
                    )
                  }
                >
                  Link
                </Button>
              )
            }
          />
        );
      })}
      <Feedback error={error} />
    </>
  );
}

/**
 * Adds a password to an account that arrived without one. Better Auth keeps
 * `setPassword` server-only, so this calls our own `/linking/set-password`.
 */
function Password({
  hasPassword,
  reload,
  locked,
  open,
  onToggle,
}: {
  hasPassword: boolean;
  reload: () => void;
  locked: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const { pending, error, notice, run } = useRunner();
  const [password, setPassword] = useState("");

  return (
    <Row
      label="Password"
      status={hasPassword ? <Linked /> : undefined}
      action={
        hasPassword ? undefined : (
          <Button variant="surface" disabled={locked} onClick={onToggle}>
            {open ? "Cancel" : "Add"}
          </Button>
        )
      }
    >
      {open && (
        <InlineForm
          onSubmit={() =>
            void run(
              () => authClient.linking.setPassword({ newPassword: password }),
              "Password set.",
            ).then((ok) => {
              if (!ok) return;
              setPassword("");
              reload();
              onToggle();
            })
          }
        >
          <Input.Control
            className="flex-1"
            aria-label="New password"
            type="password"
            required
            value={password}
            autoComplete="new-password"
            placeholder="New password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="classic" disabled={pending || locked}>
            Set
          </Button>
        </InlineForm>
      )}
      <Feedback error={error} notice={notice} />
    </Row>
  );
}

function Username({
  current,
  locked,
  open,
  onToggle,
}: {
  current?: string | null;
  locked: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const { pending, error, notice, run } = useRunner();
  const [username, setUsername] = useState("");

  return (
    <Row
      label="Username"
      status={
        current ? (
          <Text color="gray" className="truncate">
            @{current}
          </Text>
        ) : undefined
      }
      action={
        <Button variant="surface" disabled={locked} onClick={onToggle}>
          {open ? "Cancel" : current ? "Change" : "Claim"}
        </Button>
      }
    >
      {open && (
        <InlineForm
          onSubmit={() =>
            void run(
              () => authClient.updateUser({ username }),
              `Username set to @${username}.`,
            ).then((ok) => {
              if (!ok) return;
              setUsername("");
              onToggle();
            })
          }
        >
          <Input.Control
            className="flex-1"
            aria-label="Username"
            required
            value={username}
            placeholder="lucas"
            onChange={(e) => setUsername(e.target.value)}
          />
          <Button type="submit" variant="classic" disabled={pending || locked}>
            Save
          </Button>
        </InlineForm>
      )}
      <Feedback error={error} notice={notice} />
    </Row>
  );
}

/** Verifying a number while signed in attaches it here rather than elsewhere. */
function Phone({
  current,
  locked,
  open,
  onToggle,
}: {
  current?: string | null;
  locked: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const { pending, error, notice, run } = useRunner();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <Row
      label="Phone"
      status={
        current ? (
          <Text color="gray" className="truncate">
            {current}
          </Text>
        ) : undefined
      }
      action={
        <Button variant="surface" disabled={locked} onClick={onToggle}>
          {open ? "Cancel" : current ? "Change" : "Add"}
        </Button>
      }
    >
      {open &&
        (sent ? (
          <InlineForm
            onSubmit={() =>
              void run(
                () => authClient.phoneNumber.verify({ phoneNumber: phone, code }),
                `${phone} linked.`,
              ).then((ok) => {
                if (!ok) return;
                setSent(false);
                setCode("");
                onToggle();
              })
            }
          >
            <CodeInput
              className="flex-1"
              aria-label="Verification code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button type="submit" variant="classic" disabled={pending || locked}>
              Verify
            </Button>
          </InlineForm>
        ) : (
          <InlineForm
            onSubmit={() =>
              void run(() => authClient.phoneNumber.sendOtp({ phoneNumber: phone })).then(
                (ok) => ok && setSent(true),
              )
            }
          >
            <Input.Control
              className="flex-1"
              aria-label="Phone number"
              type="tel"
              required
              value={phone}
              autoComplete="tel"
              placeholder="+61 400 000 000"
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button type="submit" variant="classic" disabled={pending || locked}>
              Send code
            </Button>
          </InlineForm>
        ))}
      <Feedback error={error} notice={notice} />
    </Row>
  );
}

/** The authenticator secret, pulled back out of the otpauth:// URI for typing by hand. */
const totpSecret = (uri: string) => {
  try {
    return new URL(uri).searchParams.get("secret") ?? uri;
  } catch {
    return uri;
  }
};

/**
 * TOTP as a second factor on password sign-ins. Enabling asks for the password
 * (Better Auth requires it), hands back the authenticator secret and backup
 * codes, and only switches on once a first code verifies.
 */
function TwoFactor({
  enabled,
  hasPassword,
  locked,
  open,
  onToggle,
}: {
  enabled: boolean;
  hasPassword: boolean;
  locked: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const { pending, error, notice, run } = useRunner();
  // What the password being asked for is *for* — enabling, disabling, or
  // minting a fresh set of backup codes (which invalidates the old set).
  const [purpose, setPurpose] = useState<"enable" | "disable" | "codes">("enable");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [enrolment, setEnrolment] = useState<{ totpURI: string; backupCodes: string[] } | null>(
    null,
  );
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);

  const begin = (next: typeof purpose) => {
    setPurpose(next);
    if (!open) onToggle();
  };
  const close = () => {
    setPassword("");
    setCode("");
    setEnrolment(null);
    setFreshCodes(null);
    if (open) onToggle();
  };

  return (
    <Row
      label="Two-factor (TOTP)"
      status={
        enabled ? (
          <Badge color="green">on</Badge>
        ) : hasPassword ? undefined : (
          <Text color="gray">needs a password</Text>
        )
      }
      action={
        open ? (
          <Button variant="surface" onClick={close}>
            Cancel
          </Button>
        ) : enabled ? (
          <div className="flex gap-2">
            <Button variant="surface" disabled={locked} onClick={() => begin("codes")}>
              New codes
            </Button>
            <Button variant="surface" disabled={locked} onClick={() => begin("disable")}>
              Disable
            </Button>
          </div>
        ) : (
          <Button
            variant="surface"
            disabled={locked || !hasPassword}
            onClick={() => begin("enable")}
          >
            Enable
          </Button>
        )
      }
    >
      {open && freshCodes && (
        <div className="flex flex-col gap-2">
          <Text color="gray">Your new backup codes. The old set no longer works:</Text>
          <Code className="break-all">{freshCodes.join(" ")}</Code>
          <Button variant="classic" className="self-start" onClick={close}>
            I&rsquo;ve saved them
          </Button>
        </div>
      )}
      {open && !enrolment && !freshCodes && (
        <InlineForm
          onSubmit={() =>
            void run(
              async () => {
                if (purpose === "disable") {
                  const result = await authClient.twoFactor.disable({ password });
                  if (!result.error) close();
                  return result;
                }
                if (purpose === "codes") {
                  const { data, error } = await authClient.twoFactor.generateBackupCodes({
                    password,
                  });
                  if (error) return { error };
                  setFreshCodes(data.backupCodes);
                  return;
                }
                const { data, error } = await authClient.twoFactor.enable({ password });
                if (error) return { error };
                setEnrolment(data);
              },
              purpose === "disable" ? "Two-factor disabled." : undefined,
            )
          }
        >
          <Input.Control
            className="flex-1"
            aria-label="Your password"
            type="password"
            required
            value={password}
            autoComplete="current-password"
            placeholder="Your password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="classic" disabled={pending || locked}>
            {purpose === "disable" ? "Disable" : "Continue"}
          </Button>
        </InlineForm>
      )}
      {open && enrolment && (
        <div className="flex flex-col gap-2">
          <Text color="gray">
            Add the secret to your authenticator —{" "}
            <a href={enrolment.totpURI} className="underline">
              open it directly
            </a>{" "}
            or type it in — then confirm a code to switch it on.
          </Text>
          <Code className="break-all">{totpSecret(enrolment.totpURI)}</Code>
          <Text color="gray">
            Backup codes, in case you lose the authenticator. Each works once:
          </Text>
          <Code className="break-all">{enrolment.backupCodes.join(" ")}</Code>
          <InlineForm
            onSubmit={() =>
              void run(async () => {
                const result = await authClient.twoFactor.verifyTotp({ code });
                if (!result.error) close();
                return result;
              }, "Two-factor enabled.")
            }
          >
            <CodeInput
              className="flex-1"
              aria-label="Authenticator code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button type="submit" variant="classic" disabled={pending || locked}>
              Confirm
            </Button>
          </InlineForm>
        </div>
      )}
      <Feedback error={error} notice={notice} />
    </Row>
  );
}

function Wallets({ locked }: { locked: boolean }) {
  const { pending, error, run } = useRunner();
  const { items: wallets, reload } = useRemoteList<Wallet>(listWallets);
  const busy = pending || locked;

  const link = useCallback(
    () =>
      run(async () => {
        const { address, signature } = await signWithWallet(async (address) => {
          const { data, error } = await authClient.solana.challenge({
            address,
          });
          if (error) throw new Error(error.message || "Couldn't start the wallet challenge");
          return data.message;
        });
        return authClient.solana.link({ address, signature });
      }).then(reload),
    [run, reload],
  );

  return (
    <Row
      label="Solana wallet"
      action={
        <Button variant="surface" disabled={busy} onClick={() => void link()}>
          Connect
        </Button>
      }
    >
      {wallets.map((wallet) => (
        <div key={wallet.address} className="flex items-center justify-between gap-3">
          <Text color="gray" className="truncate font-mono">
            {wallet.address.slice(0, 6)}…{wallet.address.slice(-6)}
          </Text>
          <Destructive
            label={`Unlink wallet ${wallet.address.slice(0, 6)}…`}
            icon={Icons.Close}
            disabled={busy}
            onClick={() =>
              void run(() => authClient.solana.unlink({ address: wallet.address })).then(reload)
            }
          />
        </div>
      ))}
      <Feedback error={error} />
    </Row>
  );
}
