import { Link as UiLink, Typography } from "ljkui";
import { createFileRoute } from "@tanstack/react-router";
import { DocLink } from "@/docs/DocLink";
import { callbackFor } from "@/setup/deployment";
import { Copyable, Note, Step, VerifyStep, Wizard } from "@/setup/Wizard";
import { Chrome } from "@/site/Chrome";

const { Text } = Typography;

export const Route = createFileRoute("/setup/google")({
  head: () => ({
    meta: [
      { title: "Set up Google sign-in — AussieAuth" },
      {
        name: "description",
        content:
          "A guided walkthrough for adding Google sign-in to an AussieAuth deployment: OAuth client, redirect URI and environment variables.",
      },
    ],
  }),
  component: GoogleSetup,
});

function GoogleSetup() {
  return (
    <Chrome>
      <Wizard
        title="Set up Google sign-in"
        intro={
          <>
            Five minutes in the Google Cloud Console. The values below are already filled in for
            this deployment — copy them across rather than typing them, since a single character off
            produces <code>redirect_uri_mismatch</code> and nothing more helpful. The same
            walkthrough in prose is at{" "}
            <DocLink slug="setup/google">docs/setup/google</DocLink>
            .
          </>
        }
      >
        <Step n={1} title="Create an OAuth client">
          <Note>
            In the{" "}
            <UiLink
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
            >
              Google Cloud Console
            </UiLink>
            , go to{" "}
            <strong>
              APIs &amp; Services → Credentials → Create Credentials → OAuth client ID
            </strong>
            , and pick <strong>Web application</strong> as the type.
          </Note>
        </Step>

        <Step n={2} title="Add the redirect URI">
          <Copyable
            label="Authorized redirect URI"
            value={callbackFor("google")}
            hint={
              <>
                This is the Convex deployment, not your site. Google doesn&rsquo;t verify domains
                for the callback, so it can go straight there — Apple is the one that can&rsquo;t.
              </>
            }
          />
        </Step>

        <Step n={3} title="Set the credentials">
          <Note>
            Both are required for the provider to register at all — <code>convex/auth.ts</code>{" "}
            checks the pair, so setting one leaves Google switched off.
          </Note>
          <Copyable label="Client ID" value='bunx convex env set GOOGLE_CLIENT_ID "<client id>"' />
          <Copyable
            label="Client secret"
            value='bunx convex env set GOOGLE_CLIENT_SECRET "<client secret>"'
          />
        </Step>

        <VerifyStep n={4} method="google" label="Google">
          <Text color="gray" render={<p />}>
            Once this goes green the Google button on the sign-in card loses its &ldquo;needs
            setup&rdquo; badge.
          </Text>
        </VerifyStep>
      </Wizard>
    </Chrome>
  );
}
