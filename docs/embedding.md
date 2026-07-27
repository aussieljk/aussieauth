---
title: Using it from another app
description: Register an app against an AussieAuth deployment, trust its origins, and drop the sign-in card into it without a redirect.
order: 5
---

# Using it from another app

Nothing in the AussieAuth repo changes. The new app registers itself.

## Register the app

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
    methods: ["google", "passkey"], // omit for all fifteen
  }),
});
```

From then on those origins are trusted, they're in the passkey related-origins
list, and sessions created from them are stamped with the slug.

Registration is idempotent, so calling it on boot and letting it re-run is the
intended usage — that's what makes a wiped table repair itself.

`POST /apps/unregister` with `{slug}` takes it all back.

## Add the client

Copy `src/auth/` and `src/lib/auth-client.ts` into that app and point it at the
deployment:

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

The app never redirects to AussieAuth — it talks to the deployment from its own
origin, so the only consent screen is the provider's.

`<SignIn />` takes `methods` to narrow the list, `featured` to choose which
buttons sit on the front of the card, and `primary` for the form underneath them.

The client plugin shims in `auth-client.ts` import _types_ from `convex/lib/`, so
copy that folder too, or keep both apps pointed at one checkout. Nothing under
`src/auth/` imports Convex — the card talks to the auth server over HTTP like any
other client, so it works in a non-Convex app as well.

## What origins are for

`TRUSTED_ORIGINS` still works and is now the _bootstrap_ list — this site and
whatever you're developing against, so a fresh checkout works with an empty `apps`
table. Registered apps are added on top of it, per request.

An app's origins do double duty: they're the CORS allow-list **and** the WebAuthn
related-origins list, so registering is also what lets a passkey created on
`aussieauth.com` be used from that app. The list is served through
`aussieauth.com/.well-known/webauthn`, which `vercel.json` already proxies.

Scheme origins are filtered out of that list — a browser can't act on them, and
every entry counts against WebAuthn's five-site limit.

Because browsers honour at most **five** distinct sites and silently ignore the
rest, `/apps/register` answers with the slot usage:

```json
{
  "slug": "portfolio",
  "origins": 2,
  "passkeyOrigins": {
    "limit": 5,
    "active": ["https://aussieauth.com", "https://portfolio.com"],
    "dropped": []
  }
}
```

If your app's origin shows up in `dropped`, passkeys won't work from it —
unregister something or consolidate onto fewer sites.

## Method allow-lists

The per-app `methods` list is enforced at `/sign-in/social` rather than at the
callback, so a blocked provider never gets as far as showing you its consent
screen.

It fails **open** for origins no app has claimed, which is what keeps a
deployment's own sign-in page working with an empty table.

## Questions

**Do I have to redeploy AussieAuth to add an app?**
No. Registration is a runtime HTTP call against the registry; the trusted-origin
list is resolved per request.

**What happens if two apps claim the same origin?**
The second registration is refused rather than silently reassigned — taking over
an origin would mean taking over that app's sign-ins.

**How quickly does a new registration take effect?**
Within five seconds. The registry is cached per isolate for that long; the
isolate that handled the registration invalidates its copy immediately.

**Can I use this without Convex on the frontend?**
Yes. `src/auth/` imports no Convex. Only the backend is Convex-specific.
