import { Alert, Typography } from "@aussieljk/frosted";
import { createFileRoute } from "@tanstack/react-router";
import { DocLink } from "@/docs/DocLink";
import { SITE_URL } from "@/setup/deployment";
import { Copyable, Note, Step, VerifyStep, Wizard } from "@/setup/Wizard";
import { Chrome } from "@/site/Chrome";

const { Text } = Typography;

export const Route = createFileRoute("/setup/apple")({
  head: () => ({
    meta: [
      { title: "Set up Sign in with Apple — AussieAuth" },
      {
        name: "description",
        content:
          "A guided walkthrough for Sign in with Apple on AussieAuth: App ID, Services ID, the signing key, domain verification and the environment variables to set.",
      },
    ],
  }),
  component: AppleSetup,
});

function AppleSetup() {
  return (
    <Chrome>
      <Wizard
        title="Set up Sign in with Apple"
        intro={
          <>
            Apple is the fiddly one: the client id isn&rsquo;t what you&rsquo;d guess, the client
            secret isn&rsquo;t a secret, and the return URL has to be on a domain Apple has
            verified. Each step below says which value goes where. The same walkthrough in prose is
            at{" "}
            <DocLink slug="setup/apple" className="underline">
              docs/setup/apple
            </DocLink>
            .
          </>
        }
      >
        <Step n={1} title="Create an App ID">
          <Note>
            In the{" "}
            <a
              href="https://developer.apple.com/account/resources/identifiers/list"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Apple Developer portal
            </a>
            , go to <strong>Identifiers → + → App IDs → App</strong>. Give it a description —
            that&rsquo;s what users see during sign-in — set a bundle ID, tick{" "}
            <strong>Sign In with Apple</strong>, and register.
          </Note>
          <Copyable
            label="Bundle ID (example)"
            value="com.aussieauth.app"
            hint="Reverse-domain form. Keep it; step 6 needs it."
          />
        </Step>

        <Step n={2} title="Create a Services ID — this is your client id">
          <Note>
            Back on Identifiers, <strong>+ → Services IDs</strong>. Description is your app&rsquo;s
            name; the identifier is again reverse-domain.
          </Note>
          <Copyable label="Services ID (example)" value="com.aussieauth.app.si" />
          <Alert.Root color="amber">
            <Alert.Description>
              This identifier is <code>APPLE_CLIENT_ID</code>, <strong>not</strong> the App ID from
              step 1. It is the single most common thing to get wrong here, and the resulting error
              says nothing useful.
            </Alert.Description>
          </Alert.Root>
        </Step>

        <Step n={3} title="Configure the Services ID">
          <Note>
            Open it, enable <strong>Sign In with Apple</strong>, click Configure, and set the App ID
            from step 1 as the primary.
          </Note>
          <Copyable label="Domain" value="aussieauth.com" />
          <Copyable
            label="Return URL"
            value={`${SITE_URL}/api/auth/callback/apple`}
            hint={
              <>
                Your own domain — <strong>not</strong> the <code>.convex.site</code> deployment.
                Apple verifies the domain before accepting a return URL and won&rsquo;t take{" "}
                <code>localhost</code> or anything without TLS, so this one path is proxied through
                the site by <code>vercel.json</code>. Every other provider calls the deployment
                directly.
              </>
            }
          />
        </Step>

        <Step n={4} title="Create the signing key">
          <Note>
            <strong>Keys → +</strong>, name it, tick <strong>Sign In with Apple</strong>, choose
            your primary App ID, and download the <code>.p8</code> file. Apple gives it to you
            exactly once.
          </Note>
          <Copyable
            label="Services ID from step 2"
            value='bunx convex env set APPLE_CLIENT_ID "com.aussieauth.app.si"'
          />
          <Copyable
            label="Team ID — top right of the developer portal"
            value='bunx convex env set APPLE_TEAM_ID "<team id>"'
          />
          <Copyable
            label="Key ID — shown with the key you just made"
            value='bunx convex env set APPLE_KEY_ID "<key id>"'
          />
          <Copyable
            label="Private key — the whole file, BEGIN/END lines included"
            value='bunx convex env set APPLE_PRIVATE_KEY "$(cat AuthKey_XXXXXXXXXX.p8)"'
            hint="Escaped \n are fine; they're unescaped before parsing."
          />
          <Note>
            There is no client secret to set. Apple&rsquo;s is a JWT you sign yourself, and it
            rejects one dated more than six months out — so AussieAuth stores the key material and
            mints a fresh token per request. Nothing here expires and nothing needs rotating.
          </Note>
        </Step>

        <Step n={5} title="Verify the domain">
          <Note>
            Apple hands you a verification file when you add the domain in step 3. Paste its
            contents into an environment variable rather than committing it —{" "}
            <code>convex/http.ts</code> serves it at the path Apple looks for, and{" "}
            <code>vercel.json</code> proxies that path from your domain.
          </Note>
          <Copyable
            label="Domain association"
            value='bunx convex env set APPLE_DOMAIN_ASSOCIATION "<file contents>"'
          />
          <Copyable
            label="Where Apple will fetch it"
            value={`${SITE_URL}/.well-known/apple-developer-domain-association.txt`}
            hint="Load it in a browser first, then press Verify in the portal."
          />
        </Step>

        <Step n={6} title="Native iOS, if you have one">
          <Note>
            For native sign-in Apple issues the id token against the <strong>bundle id</strong>, not
            the Services ID, so without this the JWT validation fails. Skip this step if
            there&rsquo;s no iOS app.
          </Note>
          <Copyable
            label="Bundle identifier from step 1"
            value='bunx convex env set APPLE_APP_BUNDLE_IDENTIFIER "com.aussieauth.app"'
          />
          <Note>
            <code>APPLE_APP_SITE_ASSOCIATION</code> serves the file iOS fetches to let a native app
            use this domain&rsquo;s passkeys and links. It 404s while unset, which is the honest
            answer — iOS caches what it fetches, so a malformed file is worse than no file.
          </Note>
        </Step>

        <VerifyStep n={7} method="apple" label="Apple">
          <Text color="gray" className="block">
            This checks all four of <code>APPLE_CLIENT_ID</code>, <code>APPLE_TEAM_ID</code>,{" "}
            <code>APPLE_KEY_ID</code> and <code>APPLE_PRIVATE_KEY</code> — the provider only
            registers when every one is present.
          </Text>
        </VerifyStep>
      </Wizard>
    </Chrome>
  );
}
