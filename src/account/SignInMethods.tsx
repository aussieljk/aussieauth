import { Badge, Button, Card, Heading, Separator, Text } from "@aussieljk/frosted";
import { type ReactNode, useCallback, useState } from "react";
import { CodeField, Feedback, Field, PanelForm, Submit } from "@/auth/ui";
import { useRemoteList } from "@/auth/useRemoteList";
import { useRunner } from "@/auth/useRunner";
import { authClient } from "@/lib/auth-client";
import { signWithWallet } from "@/lib/wallet";

/**
 * Everything that can get you into *this* account, in one list. Adding a
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
  } | null;
  /** The shared demo account: the server refuses all of these, so grey them. */
  locked?: boolean;
}) {
  const { items: accounts, reload } = useRemoteList<Account>(listAccounts);
  const hasPassword = accounts.some((a) => a.providerId === "credential");

  return (
    <Card size="3">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Heading size="3">Sign-in methods</Heading>
          <Text size="2" color="gray">
            {locked
              ? "Locked on the shared demo account."
              : "Every method below opens the same account. Link as many as you like."}
          </Text>
        </div>

        <Social accounts={accounts} reload={reload} locked={locked} />
        <Separator className="w-full" />
        <Password hasPassword={hasPassword} reload={reload} locked={locked} />
        <Separator className="w-full" />
        <Username current={user?.username} locked={locked} />
        <Separator className="w-full" />
        <Phone current={user?.phoneNumber} locked={locked} />
        <Separator className="w-full" />
        <Wallets locked={locked} />
      </div>
    </Card>
  );
}

/** A labelled block inside the card, so every method reads the same way. */
function Method({
  title,
  detail,
  children,
}: {
  title: string;
  detail?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <Text size="2" weight="medium">
          {title}
        </Text>
        {detail && (
          <Text size="1" color="gray">
            {detail}
          </Text>
        )}
      </div>
      {children}
    </div>
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
    <Method
      title="Social providers"
      detail="Linking here means signing in with that provider lands on this account."
    >
      <div className="flex flex-col gap-2">
        {SOCIAL.map(({ id, label }) => {
          const account = accounts.find((a) => a.providerId === id);
          return (
            <div key={id} className="flex items-center justify-between gap-3">
              <Text size="2">
                {label}{" "}
                {account && (
                  <Badge size="1" color="green">
                    linked
                  </Badge>
                )}
              </Text>
              {account ? (
                <Button
                  variant="ghost"
                  size="1"
                  color="red"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      authClient.unlinkAccount({
                        providerId: id,
                        accountId: account.accountId,
                      }),
                    ).then(reload)
                  }
                >
                  Unlink
                </Button>
              ) : (
                <Button
                  variant="surface"
                  size="1"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      authClient.linkSocial({
                        provider: id,
                        callbackURL: window.location.origin,
                      }),
                    )
                  }
                >
                  Link
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <Feedback error={error} />
    </Method>
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
}: {
  hasPassword: boolean;
  reload: () => void;
  locked: boolean;
}) {
  const { pending, error, notice, run } = useRunner();
  const [password, setPassword] = useState("");

  if (hasPassword) {
    return (
      <Method title="Password" detail="Set. Sign in with your email address.">
        <Badge size="1" color="green" className="self-start">
          linked
        </Badge>
      </Method>
    );
  }

  return (
    <Method title="Password" detail="Add one and your email address works too.">
      <PanelForm
        onSubmit={() =>
          void run(
            () => authClient.linking.setPassword({ newPassword: password }),
            "Password set.",
          ).then((ok) => {
            if (ok) {
              setPassword("");
              reload();
            }
          })
        }
      >
        <Field
          label="New password"
          type="password"
          required
          value={password}
          autoComplete="new-password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <Submit pending={pending || locked}>Set password</Submit>
      </PanelForm>
      <Feedback error={error} notice={notice} />
    </Method>
  );
}

function Username({
  current,
  locked,
}: {
  current?: string | null;
  locked: boolean;
}) {
  const { pending, error, notice, run } = useRunner();
  const [username, setUsername] = useState("");

  return (
    <Method
      title="Username"
      detail={
        current ? `Currently @${current}.` : "Claim one to sign in by handle."
      }
    >
      <PanelForm
        onSubmit={() =>
          void run(
            () => authClient.updateUser({ username }),
            `Username set to @${username}.`,
          ).then((ok) => ok && setUsername(""))
        }
      >
        <Field
          label={current ? "New username" : "Username"}
          required
          value={username}
          placeholder="lucas"
          onChange={(e) => setUsername(e.target.value)}
        />
        <Submit pending={pending || locked}>
          {current ? "Change" : "Claim"}
        </Submit>
      </PanelForm>
      <Feedback error={error} notice={notice} />
    </Method>
  );
}

/** Verifying a number while signed in attaches it here rather than elsewhere. */
function Phone({
  current,
  locked,
}: {
  current?: string | null;
  locked: boolean;
}) {
  const { pending, error, notice, run } = useRunner();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <Method
      title="Phone number"
      detail={current ? `Currently ${current}.` : "Sign in by SMS code."}
    >
      {sent ? (
        <PanelForm
          onSubmit={() =>
            void run(
              () => authClient.phoneNumber.verify({ phoneNumber: phone, code }),
              `${phone} linked.`,
            ).then((ok) => {
              if (ok) {
                setSent(false);
                setCode("");
              }
            })
          }
        >
          <CodeField
            value={code}
            required
            onChange={(e) => setCode(e.target.value)}
          />
          <Submit pending={pending || locked}>Verify and link</Submit>
        </PanelForm>
      ) : (
        <PanelForm
          onSubmit={() =>
            void run(() =>
              authClient.phoneNumber.sendOtp({ phoneNumber: phone }),
            ).then((ok) => ok && setSent(true))
          }
        >
          <Field
            label={current ? "New number" : "Phone number"}
            type="tel"
            required
            value={phone}
            autoComplete="tel"
            placeholder="+61 400 000 000"
            onChange={(e) => setPhone(e.target.value)}
          />
          <Submit pending={pending || locked}>Send code</Submit>
        </PanelForm>
      )}
      <Feedback error={error} notice={notice} />
    </Method>
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
          if (error)
            throw new Error(
              error.message || "Couldn't start the wallet challenge",
            );
          return data.message;
        });
        return authClient.solana.link({ address, signature });
      }).then(reload),
    [run, reload],
  );

  return (
    <Method
      title="Solana wallet"
      detail="Sign a message to attach a wallet to this account."
    >
      {wallets.map((wallet) => (
        <div
          key={wallet.address}
          className="flex items-center justify-between gap-3"
        >
          <Text size="2" className="truncate font-mono">
            {wallet.address.slice(0, 6)}…{wallet.address.slice(-6)}
          </Text>
          <Button
            variant="ghost"
            size="1"
            color="red"
            disabled={busy}
            onClick={() =>
              void run(() =>
                authClient.solana.unlink({ address: wallet.address }),
              ).then(reload)
            }
          >
            Unlink
          </Button>
        </div>
      ))}
      <Button
        variant="surface"
        size="2"
        className="self-start"
        disabled={busy}
        onClick={() => void link()}
      >
        Connect a wallet
      </Button>
      <Feedback error={error} />
    </Method>
  );
}
