import { Typography } from "@aussieljk/frosted";
import { createFileRoute } from "@tanstack/react-router";
import { DocLink } from "@/docs/DocLink";
import { callbackFor, SITE_URL } from "@/setup/deployment";
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
          "A guided walkthrough for adding Google sign-in and Google One Tap to an AussieAuth deployment: OAuth client, redirect URI, JavaScript origins and environment variables.",
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
            <DocLink slug="setup/google" className="underline">
              docs/setup/google
            </DocLink>
            .
          </>
        }
      >
        <Step n={1} title="Create an OAuth client">
          <Note>
            In the{" "}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Google Cloud Console
            </a>
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

        <Step n={3} title="Add the JavaScript origins">
          <Note>
            Under <strong>Authorized JavaScript origins</strong>, add every origin that will show a
            sign-in card. Only One Tap needs these, but adding them now saves a confusing failure
            later.
          </Note>
          <Copyable label="This site" value={SITE_URL} />
          <Copyable
            label="Your development origin"
            value="https://aussieauth.localhost"
            hint="Whatever `bun dev` serves — add each app's origin too."
          />
        </Step>

        <Step n={4} title="Set the credentials">
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

        <Step n={5} title="One Tap, if you want it">
          <Note>
            One Tap renders in your page rather than through a redirect, so the client id has to be
            in the frontend bundle as well. It&rsquo;s read from the bundle deliberately: a late
            answer from the server would shove the sign-in card&rsquo;s contents down the page a
            beat after first paint.
          </Note>
          <Copyable
            label=".env.local"
            value='VITE_GOOGLE_CLIENT_ID="<the same client id>"'
            hint="Leave it unset and the card simply hides the One Tap entry — that's a supported state, not a broken one."
          />
        </Step>

        <VerifyStep n={6} method="google" label="Google">
          <Text color="gray" className="block">
            Once this goes green the Google button on the sign-in card loses its &ldquo;needs
            setup&rdquo; badge.
          </Text>
        </VerifyStep>
      </Wizard>
    </Chrome>
  );
}
