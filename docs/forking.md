---
title: Fork it — run your own auth server
description: Clone AussieAuth, point it at your own Convex deployment, and run a private auth backend with all fifteen methods under a domain you own.
order: 2.5
---

# Fork it — run your own auth server

This is the main path. AussieAuth isn't a service you sign up for — it's a repo
you run. Forking gives you one auth backend, on your own Convex deployment, that
every one of your apps can sign in against, with no third party in the middle and
no per-user pricing.

## What you end up with

- A Convex deployment you own, holding your users and sessions.
- All fifteen methods available, each switched on the moment you set its
  credentials — and invisible until then.
- A site (the landing, docs, `/setup/*` walkthroughs, `/admin`) you can deploy to
  your own domain, or delete entirely if you only want the backend.

## Steps

**1. Fork and clone.**

```sh
gh repo fork aussieljk/aussieauth --clone
cd aussieauth
bun install
```

**2. Create your own Convex deployment.**

```sh
bunx convex dev
```

This creates a fresh project under *your* Convex account and writes its URL to
`.env.local`. Nothing is shared with the upstream deployment.

**3. Set the one required secret.**

```sh
bunx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
bunx convex env set SITE_URL https://aussieauth.localhost
```

Every other secret is optional — see the table in the
[Quickstart](/docs/quickstart). A method whose credentials are missing is simply
a method your deployment doesn't offer.

**4. Run it.**

```sh
bun dev
```

Every method that needs no third party works immediately: email/password,
username, passkeys, Solana, anonymous, account numbers, demo, and agent keys.
Magic links and OTP codes work too — the link or code is written to the Convex
logs until you set `RESEND_API_KEY`.

## Making it yours

- **Name and branding.** The package publishes as `@aussieljk/auth`; rename it in
  `packages/react/package.json` if you'll publish your own. The site's copy lives
  in `src/site/` and `docs/`.
- **Third-party methods.** Google and Apple each have a guided walkthrough in the
  app at `/setup/google` and `/setup/apple` that fills in *your* deployment's
  real callback URLs. See [Google](/docs/setup/google) and [Apple](/docs/setup/apple).
- **Only want the backend?** Delete `src/routes/` and deploy just the Convex
  functions. Your apps talk to it over HTTP — see
  [Using it from another app](/docs/embedding).

## Deploying your fork

The site deploys to Vercel; the backend stays on Convex. A push to `master`
auto-deploys the site once three repository secrets are set —
`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Full details in
[Deploying](/docs/deploying).

Keep the Convex push manual (`bunx convex dev --once`): a schema change wants a
human watching it.
