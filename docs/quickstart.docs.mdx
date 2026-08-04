---
title: Quickstart
description: Get AussieAuth running locally in five commands, with every method that doesn't need a third party working out of the box.
order: 2
---

# Quickstart

```sh
bun install
bunx convex dev                                    # creates the project, writes .env.local
bunx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
bunx convex env set SITE_URL https://aussieauth.localhost
bun dev
```

`bun dev` runs vite through [portless](https://github.com/tobias-tengler/portless),
which serves the app at `https://aussieauth.localhost`.

## SITE_URL is the deployed origin, not the local one

`SITE_URL` points at the **deployed** origin, not the one you're developing on.
It's the relying party id for passkeys and the base for emailed links, so it has
to be the one real users are on. Local origins go in `TRUSTED_ORIGINS` instead.

## What works immediately

That's enough for every method that doesn't need a third party: email/password,
username, passkeys, Solana, anonymous, account numbers, demo, and agent keys.

Magic links and OTP codes work too — without `RESEND_API_KEY` the link or code is
written to the Convex logs instead of an inbox, which is usually what you want
while developing.

That fallback is local-only. It applies when `SITE_URL` points at localhost; off
a real domain, a missing provider key is an error rather than a log line, because
a magic link _is_ the credential and "sent" that quietly means "logged" is the
worst of both.

## Environment variables are typed

Every variable the backend reads is declared in `convex/convex.config.ts`, so the
functions get a typed `env` from `./_generated/server` rather than `process.env`.
A misspelled name is a type error, and Convex validates values when they're set.
Adding a variable means declaring it there first.

`BETTER_AUTH_SECRET` is the only one declared required: leave it unset and the
push is refused, rather than Better Auth quietly signing sessions with a fallback.
Everything else is optional, because an unset variable is a method this deployment
doesn't offer, not a broken deployment.

## Third-party credentials

Each provider is registered only when its variables are set. Set them with
`bunx convex env set`.

| Method            | Variables                                                                             | Callback / redirect URL                                     |
| ----------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Google            | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                                            | `https://<deployment>.convex.site/api/auth/callback/google` |
| GitHub            | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`                                            | `https://<deployment>.convex.site/api/auth/callback/github` |
| Apple             | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`               | `https://<deployment>.convex.site/api/auth/callback/apple`  |
| Email (links/OTP) | `RESEND_API_KEY`, `EMAIL_FROM`                                                        | —                                                           |
| SMS (OTP)         | `MOBILE_MESSAGE_API_USERNAME`, `MOBILE_MESSAGE_API_PASSWORD`, `MOBILE_MESSAGE_SENDER` | —                                                           |

Google and Apple each have a guided walkthrough: [Setting up Google](/docs/setup/google)
and [Setting up Apple](/docs/setup/apple).

## Tests

```sh
bun run test             # everything
bun run test:unit        # just the fast node ones
bun run test:component   # just the browser ones
```

Use `bun run test`, not `bun test` — the latter is Bun's own runner, not vitest.

## Changing the auth schema

Adding or removing a Better Auth plugin can change the tables it needs:

```sh
bun run auth:schema     # regenerates convex/betterAuth/schema.ts from convex/auth.ts
```

This replaces the documented `npx auth generate`, whose published CLI still
targets Better Auth 1.4.

## Questions

**Why `bun run test` rather than `bun test`?**
`bun test` is Bun's built-in runner and won't pick up the vitest projects, the
browser provider, or the setup files. It will appear to run and find nothing.

**Do I need `RESEND_API_KEY` to develop?**
No. With a localhost `SITE_URL` and no key, magic links and OTP codes are written
to the Convex logs — faster to work with than a real inbox. On a deployment whose
`SITE_URL` is a real domain, sending without a key throws instead, so a lapsed
key surfaces as an error rather than as mail that never arrives.

**Why won't `SITE_URL` accept my localhost origin?**
It will, but it shouldn't be one. Passkeys bind to `SITE_URL`'s hostname as their
relying party id, so pointing it at localhost creates passkeys that don't work in
production. Put local origins in `TRUSTED_ORIGINS`.
