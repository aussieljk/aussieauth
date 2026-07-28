# AussieAuth

A self-hosted auth server on Convex + Better Auth, with fifteen sign-in methods
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

That's enough for every method that doesn't need a third party: email/password,
username, passkeys, Solana, anonymous, account numbers, demo, and agent keys.
Magic links and OTP codes work too — with a localhost `SITE_URL` and no
`RESEND_API_KEY`, the link or code is written to the Convex logs instead of an
inbox. Point `SITE_URL` at a real domain and a missing key becomes an error
instead: a deployment real people use shouldn't answer "check your email" and
then log the credential.

Google and Apple each have a guided walkthrough in the app itself, at
`/setup/google` and `/setup/apple`, which fill in this deployment's real
callback URLs and check the credentials once they're set.

## Everything else

**The documentation lives in [`docs/`](./docs) and is served at
[aussieauth.com/docs](https://aussieauth.com/docs).** That's the source of
truth — the site pages, `/llms.txt`, `/llms-full.txt` and the raw markdown at
`/docs/<slug>.md` are all generated from those files, so they can't drift.

|                                                  |                                                                |
| ------------------------------------------------ | -------------------------------------------------------------- |
| [Quickstart](./docs/quickstart.md)               | Environment variables, third-party credentials, tests          |
| [Setting up Google](./docs/setup/google.md)      | OAuth client, redirect URI                                     |
| [Setting up Apple](./docs/setup/apple.md)        | Services ID, signing key, domain verification                  |
| [Using it from another app](./docs/embedding.md) | Registering an app, trusting its origins, dropping in the card |
| [Native apps](./docs/native.md)                  | Expo, scheme origins, prefix matching                          |
| [Deploying](./docs/deploying.md)                 | Vercel, and the four paths that must be proxied                |
| [Architecture](./docs/architecture.md)           | What's in each directory, and why                              |
| [Method notes](./docs/methods.md)                | What's non-obvious about each of the fifteen                   |

## Commands

```sh
bun dev                  # the site, at https://aussieauth.localhost
bun run dev:backend      # convex dev
bun run test             # unit + component  (not `bun test` — that's Bun's own runner)
bun run test:e2e         # whole flows against the running site — start `bun dev` first
bun run lint             # tsc --noEmit && oxlint --type-aware
bun run format           # oxfmt
bun run cosmos           # the fixture workbench, at localhost:7007
bun run build            # prerenders every page to dist/client
bun run auth:schema      # regenerate convex/betterAuth/schema.ts after a plugin change
bun run docs:llms        # regenerate llms.txt, llms-full.txt and the raw markdown
```

`bun run build` runs `docs:llms` first, so the generated files are never stale
in a deploy.
