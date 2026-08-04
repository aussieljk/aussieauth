---
title: Setting up Apple
description: Register a Services ID, mint the signing key, verify the domain, and enable Sign in with Apple on an AussieAuth deployment.
order: 4
---

# Setting up Apple

There is a guided version of this page at [/setup/apple](/setup/apple), which
fills in your deployment's real values and checks each credential as you set it.
This is the same walkthrough in text.

Apple is the fiddly one, for three reasons: the client id isn't what you'd guess,
the client secret isn't a secret, and the return URL has to be on a domain Apple
has verified.

## 1. Create an App ID

In the [Apple Developer portal](https://developer.apple.com/account/resources/identifiers/list),
go to **Certificates, Identifiers & Profiles → Identifiers → `+` → App IDs → App**.

- Give it a description — this is shown to users during sign-in
- Set a bundle ID in reverse-domain form, e.g. `com.aussieauth.app`
- Tick **Sign In with Apple** under Capabilities
- Register

## 2. Create a Services ID — this is your client id

Back on Identifiers, **`+` → Services IDs**.

- Description: your app's name
- Identifier: reverse-domain form, e.g. `com.aussieauth.app.si`
- Register

**This identifier is `APPLE_CLIENT_ID`, not the App ID from step 1.** It is the
single most common thing to get wrong here, and the resulting error says nothing
useful.

## 3. Configure the Services ID

Open the Services ID, enable **Sign In with Apple**, and click Configure.

- Primary App ID: the App ID from step 1
- Domains: your site's root domain, e.g. `aussieauth.com`
- Return URL:

```
https://aussieauth.com/api/auth/callback/apple
```

**Your own domain — not `.convex.site`.** Apple verifies the domain before it
accepts a return URL, and it won't take `localhost` or anything without TLS. The
Convex deployment hostname isn't a domain you can verify, so the callback comes
back to your site and `vercel.json` proxies that one path through to the
deployment. Every other provider calls the deployment directly.

## 4. Create the signing key

**Keys → `+`**, name it, tick **Sign In with Apple**, and choose your primary App
ID. Download the `.p8` file — Apple gives it to you exactly once.

You now have three things:

- `APPLE_TEAM_ID` — top right of the developer portal
- `APPLE_KEY_ID` — shown with the key you just made
- `APPLE_PRIVATE_KEY` — the whole `.p8` file, including the `BEGIN`/`END` lines

```sh
bunx convex env set APPLE_CLIENT_ID "com.aussieauth.app.si"
bunx convex env set APPLE_TEAM_ID "<team id>"
bunx convex env set APPLE_KEY_ID "<key id>"
bunx convex env set APPLE_PRIVATE_KEY "$(cat AuthKey_XXXXXXXXXX.p8)"
```

Escaped `\n` in the key are fine; they're unescaped before parsing.

### Why there's no client secret

Apple's "client secret" is a JWT you sign yourself, and Apple rejects one dated
more than six months out. So AussieAuth doesn't store a secret at all — you set
the key material and `convex/lib/apple.ts` mints a fresh token per request. There
is nothing to rotate and nothing to expire.

## 5. Verify the domain

Apple gives you a verification file when you add the domain in step 3. Paste its
contents into an environment variable rather than committing it:

```sh
bunx convex env set APPLE_DOMAIN_ASSOCIATION "<file contents>"
```

`convex/http.ts` serves it at `/.well-known/apple-developer-domain-association.txt`,
and `vercel.json` proxies that path from your domain — which is where Apple looks.
Then press **Verify** in the portal.

## 6. Native iOS, if you have one

Set `APPLE_APP_BUNDLE_IDENTIFIER` to the App ID from step 1 if a native iOS app
will sign in with an id token. For native sign-in Apple issues the token against
the **bundle id**, not the Services ID, so without this the JWT validation fails.

`APPLE_APP_SITE_ASSOCIATION` serves the file iOS fetches to let a native app use
this domain's passkeys and links. It 404s while unset, which is the honest answer
— iOS caches what it fetches, so a malformed file is worse than no file.

## Questions

**Which identifier is `APPLE_CLIENT_ID`?**
The Services ID from step 2, e.g. `com.aussieauth.app.si`. Not the App ID.

**Why can't I use localhost or my `.convex.site` URL as the return URL?**
Apple verifies the domain before accepting it, and won't take `localhost` or a
host without a valid TLS certificate on a domain you control. Use your real
domain and let the proxy forward the callback.

**Where do I get the client secret?**
You don't. AussieAuth signs one per request from the `.p8` key, because Apple
refuses secrets dated more than six months ahead.

**I lost the `.p8` file.**
Apple only lets you download it once. Revoke the key and create a new one, then
update `APPLE_KEY_ID` and `APPLE_PRIVATE_KEY`.

**Why is `appleid.apple.com` a trusted origin?**
Apple returns its callback as a form POST, so the browser sends Apple's origin
rather than yours. It's a permanent entry in the trusted-origin list for that
reason, and it never touches WebAuthn.

**Apple only gave me the user's email the first time.**
That's Apple's behaviour: the email claim is present during initial authorization
and omitted on later sign-ins. The account already exists by then.
