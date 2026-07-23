---
title: What AussieAuth is
description: A self-hosted auth server on Convex and Better Auth, with sixteen sign-in methods and no consent screen of its own.
order: 1
---

# What AussieAuth is

AussieAuth is a self-hosted authentication server built on [Convex](https://convex.dev)
and [Better Auth](https://better-auth.com). It offers sixteen sign-in methods and,
unlike a hosted auth provider, it has no consent screen of its own.

## Why there's no second consent screen

An app that uses AussieAuth talks to the Convex deployment straight from its own
origin. There is no redirect to an AussieAuth-hosted page in the middle, so
signing in with Google shows Google's consent screen and nothing else.

This is the whole design. Hosted auth providers typically put you through two
approvals — the identity provider's, then the auth provider's, on behalf of the
app you were actually trying to use. AussieAuth removes the middle one by never
being a page you visit.

## The sixteen methods

| Method              | What it is                                                 |
| ------------------- | ---------------------------------------------------------- |
| Google              | OAuth via a Google account                                 |
| Google One Tap      | Silent sign-in from an existing Google session             |
| GitHub              | OAuth via a GitHub account                                 |
| Apple               | Sign in with Apple, including Hide My Email                |
| Solana Wallet       | Sign a message with Phantom, Solflare or Backpack          |
| Passkey             | Face ID, Touch ID or a security key                        |
| Email & Password    | The classic credential pair                                |
| Phone & Password    | A mobile number instead of an email address                |
| Username & Password | No email on file at all                                    |
| Magic Link          | A one-click sign-in link, by email                         |
| Email OTP           | Six digits sent to an inbox                                |
| SMS Code            | Six digits by text, autofilled by iOS Passwords            |
| Demo Account        | One shared sandbox account, no sign-up                     |
| Anonymous           | A throwaway session that can be upgraded later             |
| Account Number      | Mullvad-style — the server generates a number, you keep it |
| Agent Auth          | A long-lived API key for an autonomous agent               |

Each is registered only when its credentials are present, so a deployment offers
exactly the methods it's configured for. The sign-in card badges the rest as
"needs setup" rather than letting them fail on click.

## Where to go next

- [Quickstart](/docs/quickstart) — running locally in five commands
- [Setting up Google](/docs/setup/google) and [Apple](/docs/setup/apple) — the
  two that need a third-party console
- [Using it from another app](/docs/embedding) — the part that matters if you
  have more than one project
- [Architecture](/docs/architecture) — what's in each directory and why

## Questions

**Is AussieAuth a hosted service?**
No. It's a Convex deployment you run yourself. There's no AussieAuth account, no
tenant, and no per-user pricing — you own the database the sessions live in.

**Do users see an AussieAuth branded screen?**
Never, unless you send them to one. Apps embed the sign-in card at their own
origin and talk to the deployment over HTTP.

**What is it an alternative to?**
Clerk, WorkOS AuthKit, Auth0 — and specifically to their redirect-to-our-domain
model. The closest thing in spirit is running Better Auth yourself, which is
roughly what this is, with the Convex-shaped parts filled in.

**Does it work with a non-Convex frontend?**
Yes. Nothing under `src/auth/` imports Convex; the card talks to the auth server
over HTTP like any other client. The backend does need Convex.
