import { Badge, Card, Typography } from "@aussieljk/frosted";
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
          registry —{" "}
          <Link to="/sign-in" className="underline">
            sign in
          </Link>
          .
        </Text>
      </Shell>
    );
  }

  const { apps, passkeyOrigins } = overview;

  return (
    <Shell>
      <Card>
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <Heading>Passkey origins</Heading>
            <Badge color={passkeyOrigins.dropped.length ? "red" : "green"}>
              {passkeyOrigins.active.length ? new Set(passkeyOrigins.active.map(site)).size : 0}/
              {passkeyOrigins.limit} sites used
            </Badge>
          </div>
          <Text color="gray">
            WebAuthn honours related origins on at most {passkeyOrigins.limit} distinct sites.
          </Text>
          {passkeyOrigins.active.map((origin) => (
            <Text key={origin} className="font-mono text-[13px]">
              {origin}
            </Text>
          ))}
          {passkeyOrigins.dropped.map((origin) => (
            <Text key={origin} color="red" className="font-mono text-[13px]">
              {origin} — past the limit; passkeys won&rsquo;t work here
            </Text>
          ))}
        </div>
      </Card>

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
              <div className="flex items-baseline gap-2">
                <Heading>{app.name}</Heading>
                <Code color="gray">{app.slug}</Code>
              </div>
              <Text color="gray">registered {new Date(app.updatedAt).toLocaleDateString()}</Text>
            </div>
            {app.origins.map((origin) => (
              <Text key={origin} className="font-mono text-[13px]">
                {origin}
              </Text>
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

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[880px] flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <Heading>Registered apps</Heading>
        <Link to="/account" className="text-[13px] underline">
          Your account →
        </Link>
      </div>
      {children}
    </div>
  );
}
