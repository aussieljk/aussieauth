---
title: Deploying
description: How AussieAuth deploys to Vercel, and the four paths that must be proxied from the site's own domain rather than served from Convex.
order: 7
---

# Deploying

The site builds to static files. Every route is prerendered at build time, so
`dist/client` deploys as plain static output with no server at request time —
`vercel.json` sets `outputDirectory` accordingly.

## The four proxied paths

`vercel.json` rewrites four paths from `aussieauth.com` to the Convex deployment.
They're there because a third party checks them **against the domain**, so serving
them from `.convex.site` wouldn't count:

| Path                                                  | Who fetches it, and why                                       |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| `/api/auth/callback/apple`                            | Apple only returns to a domain you've verified                |
| `/.well-known/apple-developer-domain-association.txt` | Apple's domain verification                                   |
| `/.well-known/webauthn`                               | The browser, from the passkey relying party's domain          |
| `/.well-known/apple-app-site-association`             | iOS, to let a native app use this domain's passkeys and links |

Everything else talks to `.convex.site` directly.

## The deployment hostname is hardcoded

**The deployment hostname appears literally in those four lines**, because Vercel
doesn't interpolate environment variables into rewrite destinations — and it
rejects unknown keys like `$comment`, so the warning can't live in the file either.

If the Convex deployment ever changes, update all four or Sign in with Apple and
cross-domain passkeys break silently. Get the hostname from `convex dev`.

## Pushing the backend

```sh
bunx convex dev --once
```

## Questions

**Why is the site static if it has an auth server?**
The auth server is the Convex deployment, and it's a separate thing. The site is
a sign-in card and some documentation; it talks to Convex over HTTP from the
browser.

**Can I host the frontend somewhere other than Vercel?**
Yes, anywhere that serves static files — but you need equivalents of the four
rewrites above, or Apple sign-in and cross-domain passkeys will fail.

**What happens if I forget to update the hardcoded hostname?**
Sign in with Apple and cross-domain passkeys stop working, with no error on the
site itself. It's the failure most worth setting a reminder for.
