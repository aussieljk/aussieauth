# AussieAuth

An auth server on Convex + Better Auth, with fifteen sign-in methods and no
consent screen of its own.

The point: an app that uses AussieAuth talks to a Convex deployment straight
from its own origin. There's no redirect to an AussieAuth-hosted page, so
signing in with Google shows Google's consent screen and nothing else.

## Two ways to use it

The only difference is whose deployment mints the session. Everything after
that — the card, the provider, `ctx.auth.getUserIdentity()` — is identical, so
moving between them is one line of config.

**Way 1 — lazy.** aussieauth.com mints it; your deployment verifies it. No auth
code in your repo, no auth tables, no secrets. In a project that already has
Convex:

```sh
bun add @aussieljk/auth
bunx aussieauth init
bunx convex dev
```

→ [docs/lazy](./docs/lazy.docs.mdx)

**Way 2 — self-hosted.** You mint it, because you forked this repo into a
deployment of your own. Your database, your credentials, your domain. Set the
fork up as below, then in the app:

```sh
bun add @aussieljk/auth
bunx aussieauth init --self-hosted
bunx convex dev
```

→ [docs/self-hosted](./docs/self-hosted.docs.mdx)

## Setup (self-hosting this repo)

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

|                                                        |                                                                |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| [Way 1 — lazy](./docs/lazy.docs.mdx)                   | Three commands, no backend to run                              |
| [Way 2 — self-hosted](./docs/self-hosted.docs.mdx)     | Fork it, own the database                                      |
| [Quickstart](./docs/quickstart.docs.mdx)               | Environment variables, third-party credentials, tests          |
| [Setting up Google](./docs/setup/google.docs.mdx)      | OAuth client, redirect URI                                     |
| [Setting up Apple](./docs/setup/apple.docs.mdx)        | Services ID, signing key, domain verification                  |
| [Using it from another app](./docs/embedding.docs.mdx) | Registering an app, trusting its origins, dropping in the card |
| [Native apps](./docs/native.docs.mdx)                  | Expo, scheme origins, prefix matching                          |
| [Deploying](./docs/deploying.docs.mdx)                 | Vercel, and the four paths that must be proxied                |
| [Architecture](./docs/architecture.docs.mdx)           | What's in each directory, and why                              |
| [Method notes](./docs/methods.docs.mdx)                | What's non-obvious about each of the fifteen                   |

## Commands

```sh
bun dev                  # the site, at https://aussieauth.localhost
                         # …and the component explorer, at /uaight
bun run dev:backend      # convex dev
bun run test             # unit + component  (not `bun test` — that's Bun's own runner)
bun run test:e2e         # whole flows against the running site — start `bun dev` first
bun run lint             # tsc --noEmit && oxlint --type-aware
bun run format           # oxfmt
bun run uaight           # a deployable static explorer, to dist-uaight/
bun run build            # prerenders every page to dist/client
bun run auth:schema      # regenerate convex/betterAuth/schema.ts after a plugin change
bun run docs:llms        # regenerate llms.txt, llms-full.txt and the raw markdown
```

`bun run build` runs `docs:llms` first, so the generated files are never stale
in a deploy.
