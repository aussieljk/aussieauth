import { Alert, Badge, Card, HStack, Link as UiLink, Spacer, Typography } from "ljkui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { AuthProvider } from "@/auth/AuthProvider";

const { Code, Heading, Text } = Typography;

export const Route = createFileRoute("/admin")({
  // Gated on a session, so there's nothing a server render could know.
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — AussieAuth" }] }),
  component: AdminRoute,
});

function AdminRoute() {
  return (
    <AuthProvider>
      <Admin />
    </AuthProvider>
  );
}

/**
 * The registry, readable. Everything here already exists server-side — this
 * page just saves a trip to the Convex dashboard to answer "which apps are
 * registered, what may they use, and how full is the passkey origin budget".
 */
function Admin() {
  const overview = useQuery(api.admin.overview);

  if (overview === undefined) {
    return (
      <Shell>
        <Text color="gray">Loading…</Text>
      </Shell>
    );
  }

  // Signed out, or signed in as anyone but ADMIN_EMAIL.
  if (overview === null) {
    return (
      <Shell>
        <Text color="gray">
          Nothing here. Sign in as the deployment&rsquo;s <Code>ADMIN_EMAIL</Code> to see the app
          registry — <UiLink render={<Link to="/sign-in" />}>sign in</UiLink>.
        </Text>
      </Shell>
    );
  }

  const { apps, passkeyOrigins } = overview;

  return (
    <Shell>
      <PasskeyBudget {...passkeyOrigins} />

      {apps.length === 0 && (
        <Card>
          <Text color="gray">
            No apps registered yet. An app joins by POSTing to <Code>/apps/register</Code>.
          </Text>
        </Card>
      )}
      {apps.map((app) => (
        <Card key={app.slug}>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <HStack alignment="firstTextBaseline" spacing={8}>
                <Heading>{app.name}</Heading>
                <Code color="gray">{app.slug}</Code>
              </HStack>
              <Text color="gray">registered {new Date(app.updatedAt).toLocaleDateString()}</Text>
            </div>
            {app.origins.map((origin) => (
              <Code key={origin} size="2" color="gray">
                {origin}
              </Code>
            ))}
            <div className="flex flex-wrap gap-1.5">
              {app.methods === null ? (
                <Badge color="gray">all methods</Badge>
              ) : (
                app.methods.map((m) => (
                  <Badge key={m} color="gray">
                    {m}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </Card>
      ))}
    </Shell>
  );
}

/** Good enough for counting distinct sites: last two dot-separated parts. */
const site = (origin: string) => {
  try {
    return new URL(origin).hostname.split(".").slice(-2).join(".");
  } catch {
    return origin;
  }
};

/**
 * The five-site WebAuthn budget, as five slots with names in them.
 *
 * A count ("3/5 sites used") is the number you'd read once and never think
 * about again; the failure this exists to prevent is the *sixth* site getting
 * passkeys that silently don't work, and you can only see that coming if you
 * can see which five are holding the slots and how many are left. Empty slots
 * are drawn rather than omitted for the same reason — "two left" is the thing
 * worth knowing before you register another app, not after.
 *
 * The limit counts distinct sites, not origins, so several origins on one site
 * share a slot: `myapp.com` and `staging.myapp.com` cost one between them.
 */
function PasskeyBudget({
  limit,
  active,
  dropped,
}: {
  limit: number;
  active: string[];
  dropped: string[];
}) {
  // One slot per distinct site, in the order they claimed it, with every
  // origin that shares it.
  const slots = new Map<string, string[]>();
  for (const origin of active) {
    const key = site(origin);
    slots.set(key, [...(slots.get(key) ?? []), origin]);
  }
  const free = Math.max(0, limit - slots.size);

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <HStack alignment="firstTextBaseline" spacing={12}>
          <Heading>Passkey sites</Heading>
          <Spacer />
          <Badge color={dropped.length ? "red" : free === 0 ? "amber" : "green"}>
            {slots.size}/{limit} used
          </Badge>
        </HStack>
        <Text color="gray">
          A browser honours related origins on at most {limit} distinct sites and ignores the rest
          without an error anywhere — so an app past the limit gets passkeys that simply don&rsquo;t
          work.
        </Text>

        <div className="flex flex-col gap-1.5">
          {[...slots].map(([name, origins], i) => (
            <Card key={name} size="1">
              <HStack alignment="firstTextBaseline" spacing={12}>
                <Text color="gray" className="w-4 shrink-0">
                  {i + 1}
                </Text>
                <div className="flex min-w-0 flex-col">
                  <Text weight="medium">{name}</Text>
                  {origins.map((origin) => (
                    <Code key={origin} size="1" color="gray">
                      {origin}
                    </Code>
                  ))}
                </div>
              </HStack>
            </Card>
          ))}

          {Array.from({ length: free }, (_, i) => (
            <Card key={`free-${i}`} size="1" variant="ghost">
              <HStack alignment="firstTextBaseline" spacing={12}>
                <Text color="gray" className="w-4 shrink-0">
                  {slots.size + i + 1}
                </Text>
                <Text color="gray">free</Text>
              </HStack>
            </Card>
          ))}
        </div>

        {dropped.length > 0 && (
          <Alert.Root color="red">
            <Alert.Title>Past the limit — passkeys don&rsquo;t work on these</Alert.Title>
            {dropped.map((origin) => (
              <Code key={origin} size="1" color="red">
                {origin}
              </Code>
            ))}
            <Alert.Description>
              Revoke an app you no longer use, or move these onto a site already holding a slot.
            </Alert.Description>
          </Alert.Root>
        )}
      </div>
    </Card>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[880px] flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <Heading>Registered apps</Heading>
        <UiLink size="1" render={<Link to="/account" />}>
          Your account →
        </UiLink>
      </div>
      {children}
    </div>
  );
}
