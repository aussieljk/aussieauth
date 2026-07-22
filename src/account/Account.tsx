import { useQuery } from "convex/react";
import {
  Badge,
  Button,
  Card,
  Code,
  DataList,
  Heading,
  Separator,
  Text,
} from "frosted-ui";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { PENDING_ACCOUNT_NUMBER } from "@/lib/storage";
import { useRemoteList } from "@/auth/useRemoteList";
import { useRunner } from "@/auth/useRunner";
import { Feedback, Field, PanelForm, Submit } from "@/auth/ui";

/** What you see once you're in: who you are, and the credentials you can add. */
export function Account() {
  const user = useQuery(api.users.current);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <Heading size="6">Your account</Heading>
        <Button
          variant="surface"
          size="2"
          onClick={() => void authClient.signOut()}
        >
          Sign out
        </Button>
      </div>

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

      <Passkeys />
      <AgentKeys />
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

type Passkey = { id: string; name?: string | null };

const listPasskeys = () => authClient.passkey.listUserPasskeys();

function Passkeys() {
  const { pending, error, run } = useRunner();
  const { items: passkeys, reload } = useRemoteList<Passkey>(listPasskeys);
  const [name, setName] = useState("");

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
            <Text size="2">{passkey.name || "Unnamed passkey"}</Text>
            <Button
              variant="ghost"
              size="1"
              color="red"
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

        <PanelForm
          onSubmit={() =>
            void run(() =>
              authClient.passkey.addPasskey({ name: name || "Passkey" }),
            ).then(() => {
              setName("");
              reload();
            })
          }
        >
          <Field
            label="Name this passkey"
            value={name}
            placeholder="MacBook"
            onChange={(e) => setName(e.target.value)}
          />
          <Submit pending={pending}>Add a passkey</Submit>
        </PanelForm>
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
 * Agent auth. A key is shown once at creation; agents send it as an
 * `x-api-key` header and Better Auth resolves it to this user's session.
 */
function AgentKeys() {
  const { pending, error, run } = useRunner();
  const { items: keys, reload } = useRemoteList<ApiKey>(listApiKeys);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);

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
              {key.name || "Unnamed key"}{" "}
              <Text size="1" color="gray">
                {key.start ? `${key.start}…` : ""}
              </Text>
            </Text>
            <Button
              variant="ghost"
              size="1"
              color="red"
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

        <PanelForm
          onSubmit={() =>
            void run(async () => {
              const { data, error } = await authClient.apiKey.create({
                name: name || "Agent",
              });
              if (error) return { error };
              setFresh(data.key);
              setName("");
              reload();
            })
          }
        >
          <Field
            label="Name this key"
            value={name}
            placeholder="Deploy bot"
            onChange={(e) => setName(e.target.value)}
          />
          <Submit pending={pending}>Create key</Submit>
        </PanelForm>
        <Feedback error={error} />
      </div>
    </Card>
  );
}
