import { Typography } from "@aussieljk/frosted";
import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/auth/AuthProvider";
import { Chrome } from "@/site/Chrome";
import { Playground } from "@/site/Playground";

const { Heading, Text } = Typography;

export const Route = createFileRoute("/playground")({
  // The card touches WebAuthn, portals and localStorage the moment it mounts,
  // so there is nothing here a prerender could produce. The page shell is
  // static; the card waits for the browser.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Playground — AussieAuth" },
      {
        name: "description",
        content:
          "Configure the AussieAuth sign-in card by clicking — methods, featured buttons, accent colour — and copy out the exact JSX.",
      },
    ],
  }),
  component: PlaygroundRoute,
});

/**
 * Named rather than inlined, so the splitter can lift the auth client into
 * this route's own chunk instead of the route tree every page loads. Same
 * reasoning as `/sign-in`.
 */
function PlaygroundRoute() {
  return (
    <Chrome>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Heading>Playground</Heading>
          <Text color="gray">
            The real <code>&lt;AussieAuthSignIn&gt;</code>, not a mockup. Change anything on the
            left and the card and the snippet both follow.
          </Text>
        </div>
        {/* The card reaches for a configured client the moment a social button
            renders, so it needs the same provider the sign-in page uses. */}
        <AuthProvider>
          <Playground />
        </AuthProvider>
      </div>
    </Chrome>
  );
}
