import { useQuery } from "convex/react";
import {
  Badge,
  Button,
  Callout,
  Card,
  Code,
  DataList,
  Heading,
  Separator,
  Text,
} from "frosted-ui";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { isDemoUser } from "@/convex/lib/demo";
import { Feedback } from "@/auth/ui";
import { useRemoteList } from "@/auth/useRemoteList";
import { useRunner } from "@/auth/useRunner";
import { authClient } from "@/lib/auth-client";
import { forgetRemembered, localSignOut } from "@/lib/rememberedAccounts";
import { AUTH_COOKIE, PENDING_ACCOUNT_NUMBER } from "@/lib/storage";
import { SignInMethods } from "./SignInMethods";

/** What you see once you're in: who you are, and the credentials you can add. */
export function Account() {
  const user = useQuery(api.users.current);
  const demo = isDemoUser(user);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col gap-5 p-6">
      <div className="flex items-center justify-between gap-3">
        <Heading size="6">Your account</Heading>
        <div className="flex items-center gap-2">
          {/* Leaves the session valid so this account stays one click away on
              the sign-in screen. "Sign out everywhere" is the real revoke. */}
          <Button variant="surface" size="2" onClick={localSignOut}>
            Sign out
          </Button>
          <Button
            variant="ghost"
            size="2"
            color="gray"
            // The demo account is shared, so revoking its sessions would sign
            // out every other visitor. The server refuses; don't offer it.
            disabled={demo}
            onClick={() =>
              void forgetRemembered({
                id: user?._id ?? "",
                name: user?.name ?? "",
                email: user?.email ?? "",
                cookie: localStorage.getItem(AUTH_COOKIE) ?? undefined,
                savedAt: Date.now(),
              })
            }
          >
            Sign out everywhere
          </Button>
        </div>
      </div>

      {demo && (
        <Callout.Root color="amber">
          <Callout.Description>
            This is the shared demo account. Everyone who clicks "Try the demo"
            lands here, so it's read-only — you can't add credentials to it or
            link it to anything. Sign up for your own account to do that.
          </Callout.Description>
        </Callout.Root>
      )}

      <AccountNumberReveal />

      <Card size="3">
        {user === undefined ? (
          <Text size="2" color="gray">
            Loading…
          </Text>
        ) : (
          <DataList.Root size="2" orientation="vertical">
            <Row label="Name" value={user?.name} />
            <Row label="Email" value={user?.email} />
            <Row label="User ID" value={user?._id} mono />
            {user?.username && <Row label="Username" value={user.username} />}
            {user?.phoneNumber && (
              <Row label="Phone" value={user.phoneNumber} />
            )}
            {user?.isAnonymous && (
              <DataList.Item>
                <DataList.Label>Type</DataList.Label>
                <DataList.Value>
                  <Badge color="amber">
                    Anonymous — upgrade to keep this account
                  </Badge>
                </DataList.Value>
              </DataList.Item>
            )}
          </DataList.Root>
        )}
      </Card>

      <SignInMethods user={user ?? null} locked={demo} />
      <Passkeys locked={demo} />
      <AgentKeys locked={demo} />
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <DataList.Item>
      <DataList.Label>{label}</DataList.Label>
      <DataList.Value>
        {mono ? <Code size="1">{value}</Code> : value}
      </DataList.Value>
    </DataList.Item>
  );
}

/**
 * A just-generated account number, shown once. It's the only copy that exists —
 * the server hashes nothing and stores no way to reach the owner.
 */
function AccountNumberReveal() {
  const [number, setNumber] = useState(() =>
    localStorage.getItem(PENDING_ACCOUNT_NUMBER),
  );

  if (!number) return null;

  return (
    <Card
      size="3"
      className="border border-[var(--amber-a6)] bg-[var(--amber-a2)]"
    >
      <div className="flex flex-col gap-3">
        <Heading size="3">Save your account number</Heading>
        <Text size="2" color="gray">
          This is the whole account. We can't email it to you, reset it, or look
          it up.
        </Text>
        <Code size="4" className="tracking-[0.2em]">
          {number.replace(/(\d{4})(?=\d)/g, "$1 ")}
        </Code>
        <Button
          variant="classic"
          size="2"
          className="self-start"
          onClick={() => {
            localStorage.removeItem(PENDING_ACCOUNT_NUMBER);
            setNumber(null);
          }}
        >
          I've saved it
        </Button>
      </div>
    </Card>
  );
}

type Passkey = { id: string; name?: string | null; createdAt?: string | Date };

const listPasskeys = () => authClient.passkey.listUserPasskeys();

/**
 * Passkeys name themselves. The authenticator identifies itself in the AAGUID
 * it returns at registration, and the server turns that into a label — see the
 * `registration.afterVerification` hook in convex/auth.ts. Nothing to type.
 */
function Passkeys({ locked }: { locked: boolean }) {
  const { pending, error, run } = useRunner();
  const { items: passkeys, reload } = useRemoteList<Passkey>(listPasskeys);
  const busy = pending || locked;

  return (
    <Card size="3">
      <div className="flex flex-col gap-3">
        <Heading size="3">Passkeys</Heading>
        <Text size="2" color="gray">
          Face ID, Touch ID or a security key. Registered against this site's
          domain.
        </Text>

        {passkeys.map((passkey) => (
          <div
            key={passkey.id}
            className="flex items-center justify-between gap-3"
          >
            <Text size="2">{passkey.name || "Passkey"}</Text>
            <Button
              variant="ghost"
              size="1"
              color="red"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  authClient.passkey.deletePasskey({ id: passkey.id }),
                ).then(reload)
              }
            >
              Remove
            </Button>
          </div>
        ))}

        <Separator className="w-full" />

        <Button
          variant="surface"
          size="2"
          className="self-start"
          disabled={busy}
          onClick={() =>
            void run(() => authClient.passkey.addPasskey()).then(reload)
          }
        >
          Add a passkey
        </Button>
        <Feedback error={error} />
      </div>
    </Card>
  );
}

type ApiKey = { id: string; name?: string | null; start?: string | null };

/** `list` answers with a paginated envelope; the hook just wants the rows. */
const listApiKeys = async () => {
  const { data } = await authClient.apiKey.list();
  return { data: data?.apiKeys };
};

/**
 * Keys are numbered, not named: the next one is always one past the highest
 * number in use, so revoking key 2 leaves 1 and 3 alone rather than handing
 * the number out twice.
 */
const nextKeyName = (keys: ApiKey[]) =>
  String(
    keys.reduce((highest, key) => {
      const n = Number(key.name);
      return Number.isInteger(n) && n > highest ? n : highest;
    }, 0) + 1,
  );

/**
 * Agent auth. A key is shown once at creation; agents send it as an
 * `x-api-key` header and Better Auth resolves it to this user's session.
 */
function AgentKeys({ locked }: { locked: boolean }) {
  const { pending, error, run } = useRunner();
  const { items: keys, reload } = useRemoteList<ApiKey>(listApiKeys);
  const [fresh, setFresh] = useState<string | null>(null);
  const busy = pending || locked;

  return (
    <Card size="3">
      <div className="flex flex-col gap-3">
        <Heading size="3">Agent keys</Heading>
        <Text size="2" color="gray">
          Long-lived credentials for agents and scripts. Sent as{" "}
          <Code size="1">x-api-key</Code>.
        </Text>

        {fresh && (
          <div className="flex flex-col gap-2 rounded-md border border-[var(--amber-a6)] bg-[var(--amber-a2)] p-3">
            <Text size="1" weight="medium">
              Copy this now — it isn't shown again.
            </Text>
            <Code size="2" className="break-all">
              {fresh}
            </Code>
          </div>
        )}

        {keys.map((key) => (
          <div key={key.id} className="flex items-center justify-between gap-3">
            <Text size="2">
              Key {key.name}{" "}
              <Text size="1" color="gray">
                {key.start ? `${key.start}…` : ""}
              </Text>
            </Text>
            <Button
              variant="ghost"
              size="1"
              color="red"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  authClient.apiKey.delete({ keyId: key.id }),
                ).then(reload)
              }
            >
              Revoke
            </Button>
          </div>
        ))}

        <Separator className="w-full" />

        <Button
          variant="surface"
          size="2"
          className="self-start"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const { data, error } = await authClient.apiKey.create({
                name: nextKeyName(keys),
              });
              if (error) return { error };
              setFresh(data.key);
              reload();
            })
          }
        >
          Create key {nextKeyName(keys)}
        </Button>
        <Feedback error={error} />
      </div>
    </Card>
  );
}
