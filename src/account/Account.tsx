import { useQuery } from "convex/react";
import { Badge, Button, Card, Typography } from "@aussieljk/frosted";
import { Icons } from "@aussieljk/frosted/icons";
import type { FunctionReturnType } from "convex/server";
import { type ReactNode, useState } from "react";
import { api } from "@/convex/_generated/api";
import { isDemoUser } from "@/convex/lib/demo";
import {
  AUTH_COOKIE,
  authClient,
  Destructive,
  Feedback,
  forgetRemembered,
  localSignOut,
  PENDING_ACCOUNT_NUMBER,
  useRemoteList,
  useRunner,
} from "@aussieljk/auth";
import { SignInMethods } from "./SignInMethods";

const { Code, Heading, Text } = Typography;

type User = FunctionReturnType<typeof api.users.current>;

/**
 * What you see once you're in: who you are on one line, and every credential
 * you can add beside it. It's a control panel rather than a page to read, so
 * it's laid out to fit a screen without scrolling.
 */
export function Account() {
  const user = useQuery(api.users.current);
  const demo = isDemoUser(user);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[880px] flex-col gap-3 p-5">
      <Identity user={user} demo={demo} />
      <AccountNumberReveal />
      <div className="grid items-start gap-3 md:grid-cols-2">
        <SignInMethods user={user ?? null} locked={demo} />
        <div className="flex flex-col gap-3">
          <Passkeys locked={demo} />
          <AgentKeys locked={demo} />
          <Sessions locked={demo} />
        </div>
      </div>
    </div>
  );
}

/** Who you're signed in as, and the two ways back out. */
function Identity({ user, demo }: { user: User | undefined; demo: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Heading>{user?.name || user?.email || "Your account"}</Heading>
          {user?.username && <Badge color="gray">@{user.username}</Badge>}
          {user?.isAnonymous && <Badge color="amber">anonymous — upgrade to keep it</Badge>}
          {/* The demo account is shared, so the server refuses every write. */}
          {demo && <Badge color="amber">shared demo — read-only</Badge>}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <Text color="gray" className="truncate">
            {user === undefined
              ? "Loading…"
              : [user?.email, user?.phoneNumber].filter(Boolean).join(" · ")}
          </Text>
          {user?._id && (
            <Code color="gray" className="truncate">
              {user._id}
            </Code>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Leaves the session valid so this account stays one click away on
            the sign-in screen. "Sign out everywhere" is the real revoke. */}
        <Button variant="surface" onClick={localSignOut}>
          Sign out
        </Button>
        {/* Kept as a labelled button rather than an icon: it's the one control
            here that ends sessions on other devices, and no glyph says that. */}
        <Button
          variant="soft"
          color="danger"
          // Revoking the demo account's sessions would sign out every other
          // visitor. The server refuses; don't offer it.
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
          <Icons.LogOut size={16} />
          Sign out everywhere
        </Button>
      </div>
    </div>
  );
}

/**
 * A just-generated account number, shown once. It's the only copy that exists —
 * the server hashes nothing and stores no way to reach the owner.
 */
function AccountNumberReveal() {
  const [number, setNumber] = useState(() => localStorage.getItem(PENDING_ACCOUNT_NUMBER));

  if (!number) return null;

  return (
    <Card className="border border-[var(--amber-a6)] bg-[var(--amber-a2)]">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <Heading>Save your account number</Heading>
          <Text color="gray">The only copy. It can't be reset or looked up.</Text>
        </div>
        <div className="flex items-center gap-3">
          {/* Amber throughout: this is a "write it down or lose the account"
              warning, and the theme accent would dress it up as good news. */}
          <Code color="amber" className="tracking-[0.2em]">
            {number.replace(/(\d{4})(?=\d)/g, "$1 ")}
          </Code>
          <Button
            variant="classic"
            color="amber"
            onClick={() => {
              localStorage.removeItem(PENDING_ACCOUNT_NUMBER);
              setNumber(null);
            }}
          >
            I've saved it
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** A card of one-line entries, with the control that adds one in its header. */
function List({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint: string;
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-2">
        <div className="flex min-h-7 items-center justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <Heading>{title}</Heading>
            <Text color="gray" className="truncate">
              {hint}
            </Text>
          </div>
          {action}
        </div>
        {children}
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
    <List
      title="Passkeys"
      hint="Face ID, Touch ID or a security key"
      action={
        <Button
          variant="surface"
          disabled={busy}
          onClick={() => void run(() => authClient.passkey.addPasskey()).then(reload)}
        >
          Add
        </Button>
      }
    >
      {passkeys.map((passkey) => (
        <div key={passkey.id} className="flex items-center justify-between gap-3">
          <Text className="truncate">{passkey.name || "Passkey"}</Text>
          <Destructive
            label={`Remove ${passkey.name || "passkey"}`}
            disabled={busy}
            onClick={() =>
              void run(() => authClient.passkey.deletePasskey({ id: passkey.id })).then(reload)
            }
          />
        </div>
      ))}
      <Feedback error={error} />
    </List>
  );
}

type SessionRow = {
  token: string;
  userAgent?: string | null;
  createdAt?: string | Date;
  current: boolean;
};

/** One fetch for the list and one for which of them is *this* tab's session. */
const listSessions = async () => {
  const [{ data: sessions }, { data: here }] = await Promise.all([
    authClient.listSessions(),
    authClient.getSession(),
  ]);
  const currentToken = here?.session?.token;
  return {
    data: sessions?.map(
      (s: Omit<SessionRow, "current">): SessionRow => ({ ...s, current: s.token === currentToken }),
    ),
  };
};

/** "Safari on macOS" from a User-Agent — just enough to tell devices apart. */
const describeSession = (ua: string | null | undefined) => {
  if (!ua) return "Unknown device";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : null;
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os ?? "Unknown device";
};

/**
 * Every live session on this account, with the one control that matters: end
 * the ones that aren't this device. The demo account is excluded server-side —
 * revoking its sessions would sign out every other visitor.
 */
function Sessions({ locked }: { locked: boolean }) {
  const { pending, error, run } = useRunner();
  const { items: sessions, reload } = useRemoteList<SessionRow>(listSessions);
  const busy = pending || locked;

  return (
    <List title="Sessions" hint="everywhere you're signed in" action={null}>
      {sessions.map((session) => (
        <div key={session.token} className="flex items-center justify-between gap-3">
          <Text className="truncate">
            {describeSession(session.userAgent)}{" "}
            <Text color="gray">
              {session.current
                ? "· this device"
                : session.createdAt
                  ? `· ${new Date(session.createdAt).toLocaleDateString()}`
                  : ""}
            </Text>
          </Text>
          {!session.current && (
            <Destructive
              label={`End the ${describeSession(session.userAgent)} session`}
              disabled={busy}
              onClick={() =>
                void run(() => authClient.revokeSession({ token: session.token })).then(reload)
              }
            />
          )}
        </div>
      ))}
      <Feedback error={error} />
    </List>
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
    <List
      title="Agent keys"
      hint="sent as x-api-key"
      action={
        <Button
          variant="surface"
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
      }
    >
      {fresh && (
        <div className="flex flex-col gap-1 rounded-md border border-[var(--amber-a6)] bg-[var(--amber-a2)] p-2">
          <Text weight="medium">Copy this now — it isn't shown again.</Text>
          <Code color="amber" className="break-all">
            {fresh}
          </Code>
        </div>
      )}

      {keys.map((key) => (
        <div key={key.id} className="flex items-center justify-between gap-3">
          <Text className="truncate">
            Key {key.name} <Text color="gray">{key.start ? `${key.start}…` : ""}</Text>
          </Text>
          <Destructive
            label={`Revoke key ${key.name}`}
            disabled={busy}
            onClick={() => void run(() => authClient.apiKey.delete({ keyId: key.id })).then(reload)}
          />
        </div>
      ))}
      <Feedback error={error} />
    </List>
  );
}
