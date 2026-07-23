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

Every variable the backend reads is declared in `convex/convex.config.ts`, so
the functions get a typed `env` from `./_generated/server` rather than
`process.env` — a misspelled name is a type error, and Convex validates values
when they're set. Adding a variable means declaring it there first.

`BETTER_AUTH_SECRET` is the only one declared required: leave it unset and the
push is refused, rather than Better Auth quietly signing sessions with a
fallback. Everything else is optional, because an unset variable is a method
this deployment doesn't offer, not a broken deployment.

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

Nothing in this repo changes. The new app registers itself.

Set the provisioning secret in **that** app's Convex, then have it POST its own
config once — origins first, everything else optional:

```sh
# in the new app
bunx convex env set AUSSIEAUTH_SECRET "<the value from this deployment>"
```

```ts
await fetch(`${AUSSIEAUTH_URL}/apps/register`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${process.env.AUSSIEAUTH_SECRET}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    slug: "portfolio", // stable id; survives a domain move
    name: "Portfolio",
    origins: ["https://portfolio.com", "http://localhost:5173"],
    methods: ["google", "passkey"], // omit for all sixteen
  }),
});
```

From then on those origins are trusted, they're in the passkey related-origins
list, and sessions created from them are stamped with the slug. Registration is
idempotent, so calling it on boot and letting it re-run is the intended usage —
that's what makes a wiped table repair itself.

`POST /apps/unregister` with `{slug}` takes it all back.

The rest of the setup is the client. Copy `src/auth/` and
`src/lib/auth-client.ts` into that app and point it at this deployment:

```tsx
// src/lib/auth-client.ts — the one line that changes per app
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_CONVEX_SITE_URL, // https://<deployment>.convex.site
  plugins: [/* … */],
});
```

```tsx
import { SignIn } from "./auth/SignIn";

<SignIn />;
```

The app never redirects here — it talks to this deployment from its own origin,
so the only consent screen is the provider's. `<SignIn />` takes `methods` to
narrow the list, `featured` to choose which buttons sit on the front of the
card, and `primary` for the form underneath them.

The client plugin shims in `auth-client.ts` import _types_ from `convex/lib/`,
so copy that folder too (or keep both apps pointed at one checkout). Nothing
under `src/auth/` imports Convex — the card talks to the auth server over HTTP
like any other client, so it works in a non-Convex app as well.

`TRUSTED_ORIGINS` still works and is now the _bootstrap_ list — this site and
whatever you're developing against, so a fresh checkout works with an empty
`apps` table. Registered apps are added on top of it, per request.

An app's origins do double duty: they're the CORS allow-list _and_ the WebAuthn
related-origins list, so registering is also what lets a passkey created on
`aussieauth.com` be used from that app. The list is served through
`aussieauth.com/.well-known/webauthn`, which `vercel.json` already proxies.
Scheme origins (below) are filtered out of that list — a browser can't act on
them, and every entry counts against WebAuthn's five-site limit.

### Native apps

`../aussieauth-ios` is the Expo client; its README covers the client half.

A native app has no `Origin` header, so `@better-auth/expo` sends its deep-link
scheme as `expo-origin` and the `expo()` plugin rewrites it back onto the
request. Everything downstream — CSRF, `trustedOrigins`, `appMethods`, the
session's `appId` — then works unchanged, which is why none of them needed a
native special case.

Such an app registers **scheme origins** rather than URLs:

```jsonc
{
  "slug": "aussieauth-ios",
  "name": "AussieAuth iOS",
  "origins": ["aussieauthios://", "exp://"],
}
```

Only the bare scheme is accepted, because these match by _prefix_. That's what
makes Expo Go work: its origin is `exp://<lan-ip>:8081/--/`, which changes with
the network and so can never be registered exactly. Prefix matching is confined
to non-http origins — doing it for web origins would mean `https://myapp.com`
claiming `https://myapp.com.evil`, and registration refuses a bare `https://`
for the same reason.

Trusting `exp://` means any Expo Go project can reach the deployment. That's
fine for a dev deployment and should not be set on a production one.

### Deploying, and the four proxied paths

`vercel.json` rewrites four paths from `aussieauth.com` to the Convex
deployment. They're there because a third party checks them **against the
domain**, so serving them from `.convex.site` wouldn't count:

| Path                                                  | Who fetches it, and why                              |
| ----------------------------------------------------- | ---------------------------------------------------- |
| `/api/auth/callback/apple`                            | Apple only returns to a domain you've verified       |
| `/.well-known/apple-developer-domain-association.txt` | Apple's domain verification                          |
| `/.well-known/webauthn`                               | The browser, from the passkey relying party's domain |
| `/.well-known/apple-app-site-association`             | iOS, to let a native app use this domain's passkeys and links |

Everything else talks to `.convex.site` directly.

**The deployment hostname is hardcoded in those four lines**, because Vercel
doesn't interpolate environment variables into rewrite destinations — and it
rejects unknown keys like `$comment`, so the warning can't live in the file
either. If the Convex deployment ever changes, update all four or Sign in with
Apple and cross-domain passkeys break silently. Get the hostname from
`convex dev`.

The last one is served from `APPLE_APP_SITE_ASSOCIATION` and 404s while that's
unset, which is the honest answer — iOS caches what it fetches, so a malformed
file is worse than no file. It's only needed once there's a real iOS build;
under Expo Go the app runs as Expo's own bundle id and none of it applies.

## How it fits together

- `convex/auth.ts` — the whole Better Auth configuration: providers, plugins,
  trusted origins, rate limiting, account linking. `createAuthOptions` is split
  out from `createAuth` because the component directory needs the options
  without env-var access.
- `convex/betterAuth/` — a **local install** of the Better Auth component. The
  packaged component ships a fixed schema with no passkey, wallet or API-key
  tables, so we own the schema instead.
- `convex/lib/` — the plugins that aren't in Better Auth: Sign In With Solana,
  Mullvad-style account numbers, the shared demo account (and its lockdown),
  `linking.ts` (adding a password to an account that arrived without one), and
  `status.ts` (which credentials are set, so the card can say "needs setup").
  Plus `apple.ts`, which mints Apple's client secret, and `notify.ts`, which
  sends via Resend / Mobile Message or falls back to logging.
- `convex/http.ts` — the two files a third party fetches from us (Apple's
  domain association, the WebAuthn related-origins list), plus
  `/apps/register` and `/apps/unregister`.
- `convex/apps.ts` + `convex/lib/apps.ts` — the app registry: who's allowed
  in, from which origins, using which methods.
- `convex/lib/methods.ts` — the one path→method map, shared by
  `lastLoginMethod` and the per-app allow-list so they can't disagree.
- `src/auth/providers.ts` — display metadata per method; `src/auth/panels.tsx` —
  the matching behaviour; `src/auth/methods.ts` wires the two together by id.
- `src/account/Account.tsx` — signed-in view: profile, passkeys and agent API
  keys; `src/account/SignInMethods.tsx` — linking extra credentials onto the
  account you're already signed in as.
- `src/lib/rememberedAccounts.ts` — the returning-account chooser (below).

### Tests

```sh
bun run test             # everything
bun run test:unit        # just the fast node ones
bun run test:component   # just the browser ones
```

(`bun run test`, not `bun test` — the latter is Bun's own runner, not vitest.)

Two projects. **unit** is plain node and covers the logic where a bug is a
security bug and there's no UI to notice it through: Solana signature
verification, the demo lockdown's path matcher, account-number generation, the
registration secret and body validation, the path→method map, and the WebAuthn
site-limit arithmetic. **component** renders the sign-in card and account page
in a real browser against mocked endpoints.

The component tests render React Cosmos fixtures — the same `*.fixture.tsx`
files the workbench shows — through the same `src/cosmos.decorator.tsx`, so a
state you can look at is a state that's covered:

```sh
bun run cosmos      # the workbench, at localhost:7007
```

A fixture is a component in a named state; `src/testing/MockApi.tsx` gives it
the endpoints and localStorage it needs. Anything worth asserting about goes in
a colocated `*.test.tsx` that imports the fixture.

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
- **Demo account** — everyone who clicks "Try the demo" lands on the _same_
  user, so the session it hands out is deliberately read-only. Setting a
  password, linking a social account, registering a passkey, minting an API key
  and revoking sessions are all refused for it; otherwise the first visitor to
  set a password would own `demo@aussieauth.com` permanently and every later
  visitor would be sharing an account with them. The deny-list is `LOCKED` in
  `convex/lib/demo.ts` — adding a method means adding it there too.
- **Rate limiting** — on, and backed by the `rateLimit` table rather than
  memory. Both defaults were wrong here: Better Auth enables rate limiting only
  when `NODE_ENV === "production"`, which a Convex deployment isn't, and its
  default memory store is a Map inside one HTTP-action isolate. So the stock
  three-sign-ins-per-ten-seconds rule wasn't holding at all. Matters most for
  account numbers, where the number is the entire credential.
- **Agent auth** — API keys, not sessions. Mint one on the account page; the
  agent sends it as an `x-api-key` header.
- **Passkeys** — bound to `SITE_URL`'s hostname as the relying party id, and
  usable from every origin in `TRUSTED_ORIGINS` via WebAuthn Related Origin
  Requests. A passkey is normally locked to the one domain that created it,
  which for a shared auth server would make the most portable-feeling method
  the least portable. `convex/http.ts` publishes the allowed origins at
  `/.well-known/webauthn`, proxied through `aussieauth.com` because the browser
  fetches it from the relying party's own domain. The spec matches on eTLD+1
  and allows at most five distinct labels, so this is a handful of apps rather
  than an open list.
- **Apple** — `https://appleid.apple.com` is a permanent trusted origin,
  because Apple returns its callback as a form POST and the browser sends
  Apple's origin rather than ours.
- **Passkey names** — nobody types one. The authenticator identifies itself in
  the AAGUID it returns at registration and the server turns that into a label
  ("iCloud Keychain", "1Password"); when it doesn't say — Apple zeroes the
  AAGUID under `attestation: "none"` — the User-Agent stands in.
- **Apps** — an app registers itself with `/apps/register`, authenticated by
  one shared `AUSSIEAUTH_SECRET`. Its origins become trusted, land in the
  passkey related-origins list, and stamp `session.appId`. An origin already
  claimed by another slug is refused rather than silently reassigned — taking
  over an origin would mean taking over that app's sign-ins. The method
  allow-list is enforced at `/sign-in/social` rather than at the callback, so a
  blocked provider never gets as far as showing you its consent screen; it
  fails **open** for origins no app has claimed, which is what keeps this
  deployment's own sign-in page working with an empty table.
- **Agent key names** — numbered, never named. The next key is one past the
  highest number in use, so revoking key 2 doesn't hand the number out twice.
- **Email verification** — sent on sign-up, but never required to sign in. It's
  there because linking checks it: attaching a social account to an existing
  user also requires that _existing_ user's address to be verified, so without
  the sign-up mail a credential user could never later add Google — they'd get
  "account not linked" and no way forward. The one-line alternative is
  `accountLinking.requireLocalEmailVerified: false`, which opens the
  pre-registration attack (sign up under someone else's address, wait for their
  Google sign-in to merge into your account).

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
