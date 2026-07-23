---
title: Native apps
description: How an Expo app signs in against AussieAuth, why it registers a scheme origin, and how prefix matching keeps Expo Go working.
order: 6
---

# Native apps

`../aussieauth-ios` is the Expo client; its README covers the client half.

## No Origin header

A native app has no `Origin` header, so [`@better-auth/expo`](https://better-auth.com/docs/integrations/expo)
sends its deep-link scheme as `expo-origin` and the `expo()` plugin rewrites it
back onto the request.

Everything downstream — CSRF, `trustedOrigins`, `appMethods`, the session's
`appId` — then works unchanged, which is why none of them needed a native special
case.

The plugin has a second job on OAuth callbacks: it appends the session cookie to
the `myapp://` redirect, because a native app has no cookie jar the browser can
write to.

## Scheme origins

Such an app registers **scheme origins** rather than URLs:

```jsonc
{
  "slug": "aussieauth-ios",
  "name": "AussieAuth iOS",
  "origins": ["aussieauthios://", "exp://"],
}
```

Only the bare scheme is accepted, because these match by _prefix_.

That's what makes Expo Go work: its origin is `exp://<lan-ip>:8081/--/`, which
changes with the network and so can never be registered exactly.

Prefix matching is confined to non-http origins. Doing it for web origins would
mean `https://myapp.com` claiming `https://myapp.com.evil`, and registration
refuses a bare `https://` for the same reason.

## A warning about `exp://`

Trusting `exp://` means any Expo Go project can reach the deployment. That's fine
for a dev deployment and should not be set on a production one.

## Questions

**Why does my Expo Go origin keep changing?**
It embeds the LAN address of the machine running the bundler. Register the bare
`exp://` scheme and let prefix matching handle the rest.

**Can a native app use a passkey created on the website?**
Yes, once `APPLE_APP_SITE_ASSOCIATION` is set and the app has a real bundle id.
Under Expo Go the app runs as Expo's own bundle id and none of it applies.

**Why aren't scheme origins in `/.well-known/webauthn`?**
Only a browser reads that file and it can't act on a custom scheme. Every entry
also counts against WebAuthn's five-site limit, so including them would push real
origins off the end.
