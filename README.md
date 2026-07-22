# AussieAuth

A self-hosted auth server on Convex + Better Auth, with sixteen sign-in methods
and no consent screen of its own.

The point: an app that uses AussieAuth talks to this Convex deployment straight
from its own origin. There's no redirect to an AussieAuth-hosted page, so
signing in with Google shows Google's consent screen and nothing else.

## Setup

```sh
bun install
bunx convex dev                                    # creates the project, writes .env.local
bunx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
bunx convex env set SITE_URL https://aussieauth.localhost
bun dev
```

`bun dev` runs vite through [portless](https://github.com/tobias-tengler/portless),
which serves the app at `https://aussieauth.localhost`. `SITE_URL` points at
the _deployed_ origin, not this one — it's the relying party id for passkeys and
the base for emailed links, so it has to be the one real users are on. Local
origins go in `TRUSTED_ORIGINS` instead.

That's enough for every method that doesn't need a third party: email/password,
username, passkeys, Solana, anonymous, account numbers, demo, and agent keys.
Magic links and OTP codes work too — without `RESEND_API_KEY` the link or code
is written to the Convex logs instead of an inbox.

### Third-party credentials

Each provider is registered only when its variables are set, and the sign-in
card badges the rest as "needs setup". Set them with `bunx convex env set`.

| Method            | Variables                                                                             | Callback / redirect URL                                     |
| ----------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Google, One Tap   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                                            | `https://<deployment>.convex.site/api/auth/callback/google` |
| GitHub            | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`                                            | `https://<deployment>.convex.site/api/auth/callback/github` |
| Apple             | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`               | `https://<deployment>.convex.site/api/auth/callback/apple`  |
| Email (links/OTP) | `RESEND_API_KEY`, `EMAIL_FROM`                                                        | —                                                           |
| SMS (OTP)         | `MOBILE_MESSAGE_API_USERNAME`, `MOBILE_MESSAGE_API_PASSWORD`, `MOBILE_MESSAGE_SENDER` | —                                                           |

Google One Tap also needs the client id on the frontend, as
`VITE_GOOGLE_CLIENT_ID` in `.env.local`, plus your app origins listed under
"Authorized JavaScript origins".

#### Apple

Apple is the fiddly one, for three reasons.

**The client id is a Services ID, not the App ID.** Register one under
Identifiers → Services IDs (`com.aussieauth.app` is fine), enable Sign In with
Apple, and configure it with the callback URL above. That identifier is
`APPLE_CLIENT_ID`.

**The "client secret" is a JWT you sign, and Apple rejects one dated more than
six months out.** So we don't store a secret at all — set the key material
instead and `convex/lib/apple.ts` mints a fresh token per request:

- `APPLE_TEAM_ID` — top right of the developer portal
- `APPLE_KEY_ID` — from Keys → `+` → tick "Sign In with Apple"
- `APPLE_PRIVATE_KEY` — the whole `.p8` file including the BEGIN/END lines.
  Escaped `\n` are fine; they're unescaped before parsing.

Set `APPLE_APP_BUNDLE_IDENTIFIER` too if a native iOS app will sign in with an
id token.

**Apple verifies the domain before it accepts a return URL,** and it won't take
`localhost` or anything without TLS — so the return URL must be the
`.convex.site` deployment, never the dev origin. Paste the file contents Apple
gives you into `APPLE_DOMAIN_ASSOCIATION`; `convex/http.ts` serves it at
`/.well-known/apple-developer-domain-association.txt` for the Verify button.

### Using it from another app

Add the app's origin to `TRUSTED_ORIGINS` (comma separated):

```sh
bunx convex env set TRUSTED_ORIGINS "https://myapp.com,http://localhost:3000"
```

Then in that app, point a Better Auth client at this deployment's `.convex.site`
URL with the `crossDomainClient()` and `convexClient()` plugins — see
`src/lib/auth-client.ts`. The app never redirects here.

## How it fits together

- `convex/auth.ts` — the whole Better Auth configuration: providers, plugins,
  trusted origins. `createAuthOptions` is split out from `createAuth` because
  the component directory needs the options without env-var access.
- `convex/betterAuth/` — a **local install** of the Better Auth component. The
  packaged component ships a fixed schema with no passkey, wallet or API-key
  tables, so we own the schema instead.
- `convex/lib/` — the plugins that aren't in Better Auth: Sign In With Solana,
  Mullvad-style account numbers, the shared demo account, and `linking.ts`
  (adding a password to an account that arrived without one). Plus `notify.ts`,
  which sends via Resend/Twilio or falls back to logging.
- `convex/status.ts` — reports which credentials are set, so the UI can say
  "needs setup" instead of failing on click.
- `src/auth/providers.ts` — display metadata per method; `src/auth/panels.tsx` —
  the matching behaviour; `src/auth/methods.ts` wires the two together by id.
- `src/account/Account.tsx` — signed-in view: profile, passkeys and agent API
  keys; `src/account/SignInMethods.tsx` — linking extra credentials onto the
  account you're already signed in as.
- `src/lib/rememberedAccounts.ts` — the returning-account chooser (below).

### Changing the auth schema

Adding or removing a Better Auth plugin can change the tables it needs:

```sh
bun run auth:schema     # regenerates convex/betterAuth/schema.ts from convex/auth.ts
```

This replaces the documented `npx auth generate`, whose published CLI still
targets Better Auth 1.4.

## Method notes

- **Solana** — Better Auth's `siwe` plugin only accepts `0x…` addresses, so
  `convex/lib/solana.ts` implements Sign In With Solana directly. The server
  composes the message and stores it; verification consumes it, so a signature
  can't be replayed.
- **Account numbers** — sign-up returns a 16-digit number once and stores it as
  the user's `username`. There is no email, password or recovery path.
- **SMS / email OTP** — the code fields use `autocomplete="one-time-code"`,
  which is what makes iOS Passwords and Android offer the code above the
  keyboard.
- **Agent auth** — API keys, not sessions. Mint one on the account page; the
  agent sends it as an `x-api-key` header.
- **Passkeys** — bound to `SITE_URL`'s hostname as the relying party id. A
  consumer app on a different domain needs its own registration.
- **Apple** — `https://appleid.apple.com` is a permanent trusted origin,
  because Apple returns its callback as a form POST and the browser sends
  Apple's origin rather than ours.
- **Passkey names** — nobody types one. The authenticator identifies itself in
  the AAGUID it returns at registration and the server turns that into a label
  ("iCloud Keychain", "1Password"); when it doesn't say — Apple zeroes the
  AAGUID under `attestation: "none"` — the User-Agent stands in.
- **Agent key names** — numbered, never named. The next key is one past the
  highest number in use, so revoking key 2 doesn't hand the number out twice.

## Coming back

The sign-in card lists accounts this browser has used before and gets you back
into one without a prompt.

`crossDomainClient` can't be handed a session cookie on a `.convex.site`
response, so it keeps the whole cookie jar as JSON in localStorage. Signing in
copies that jar into `aussieauth.accounts` alongside your name and avatar;
clicking the account puts it back and asks the server whether it still holds.
If it does you're in with no round trip to any provider. If it's expired we
re-run the method `lastLoginMethod` recorded — a silent redirect for a social
provider, or the right panel with your address already filled in.

Which is why **Sign out** doesn't revoke: it clears the local jar and leaves
the session alive, so the account stays one click away. **Sign out everywhere**
is the real thing, and so is the ✕ next to a remembered account.

## Gotcha worth knowing

`frosted-ui`'s `Button` wraps Base UI, which defaults native buttons to
`type="button"`. Inside a `<form>` you must pass `type="submit"` explicitly or
`onSubmit` never fires.
