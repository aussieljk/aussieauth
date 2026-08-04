---
title: Setting up Google
description: Register a Google OAuth client, set the redirect URI, and enable Google sign-in on an AussieAuth deployment.
order: 3
---

# Setting up Google

There is a guided version of this page at [/setup/google](/setup/google), which
fills in your deployment's real callback URL and checks the credentials once
they're set. This is the same walkthrough in text.

## 1. Create the OAuth client

In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**,
and choose **Web application** as the type.

## 2. Add the redirect URI

Under **Authorized redirect URIs**, add:

```
https://<deployment>.convex.site/api/auth/callback/google
```

`<deployment>` is your Convex deployment name — `convex dev` prints it, and it's
the hostname in `VITE_CONVEX_SITE_URL`.

Note this is the `.convex.site` deployment, **not** your app's domain. Unlike
Apple, Google doesn't verify the domain, so the callback can go straight to the
deployment and never touch your site. Getting this wrong is what produces
`redirect_uri_mismatch`.

## 3. Set the credentials

```sh
bunx convex env set GOOGLE_CLIENT_ID "<client id>"
bunx convex env set GOOGLE_CLIENT_SECRET "<client secret>"
```

Both must be present for the provider to register at all —
`convex/auth.ts` checks the pair, so setting one leaves Google switched off.

## 4. Check it

Reload the sign-in card. The Google button loses its "needs setup" badge once the
deployment can see both variables — that badge is driven by a live probe against
the server, not by anything cached in the page.

## Questions

**Why does the redirect URI point at `.convex.site` and not my domain?**
Because Google doesn't verify domains for the callback, so there's no reason to
proxy it. Apple does, which is why Apple's callback is the one path that goes
through your own domain.

**I get `redirect_uri_mismatch`.**
The URI in the Cloud Console must match the callback exactly, including the
scheme, the host and the whole `/api/auth/callback/google` path. A trailing slash
counts as a mismatch.

**Can one client id serve several apps?**
Yes. Every app that embeds AussieAuth talks to the same deployment, so they share
this one OAuth client.

**Does the user see a consent screen for my app as well as for Google?**
No. Google's is the only one. The app talks to the deployment from its own
origin, so there's no AussieAuth-hosted page to approve.
