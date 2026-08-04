---
title: Method notes
description: What's non-obvious about each of AussieAuth's fifteen sign-in methods — passkeys, Solana, account numbers, the demo account, agent keys and the rest.
order: 9
---

# Method notes

The behaviour of each method that isn't obvious from its name.

## Solana

Better Auth's `siwe` plugin only accepts `0x…` addresses, so `convex/lib/solana.ts`
implements Sign In With Solana directly. The server composes the message and
stores it; verification consumes it, so a signature can't be replayed.

## Passkeys

Bound to `SITE_URL`'s hostname as the relying party id, and usable from every
origin in `TRUSTED_ORIGINS` via WebAuthn Related Origin Requests.

A passkey is normally locked to the one domain that created it, which for a shared
auth server would make the most portable-feeling method the least portable.
`convex/http.ts` publishes the allowed origins at `/.well-known/webauthn`, proxied
through the site's own domain because the browser fetches it from the relying
party's domain.

The spec matches on eTLD+1 and allows at most **five** distinct labels, so this is
a handful of apps rather than an open list. Anything past the fifth is dropped
knowingly, with a warning in the logs, rather than silently ignored by the browser.

### Passkey names

Nobody types one. The authenticator identifies itself in the AAGUID it returns at
registration and the server turns that into a label ("iCloud Keychain",
"1Password"); when it doesn't say — Apple zeroes the AAGUID under
`attestation: "none"` — the User-Agent stands in.

## Account numbers

Sign-up returns a 16-digit number once and stores it as the user's `username`.
There is no email, password or recovery path. Mullvad's model: the number is the
entire credential.

## SMS and email OTP

The code fields use `autocomplete="one-time-code"`, which is what makes iOS
Passwords and Android offer the code above the keyboard.

## Magic links

Sent by Resend when `RESEND_API_KEY` is set, and written to the Convex logs when
it isn't and `SITE_URL` is a localhost one. Off a real domain the key is
required — see [quickstart](/docs/quickstart). Good for one sign-in.

## The demo account

Everyone who clicks "Try the demo" lands on the _same_ user, so the session it
hands out is deliberately read-only.

Setting a password, linking a social account, registering a passkey, minting an
API key and revoking sessions are all refused for it. Otherwise the first visitor
to set a password would own `demo@aussieauth.com` permanently and every later
visitor would be sharing an account with them.

The deny-list is `LOCKED` in `convex/lib/demo.ts` — adding a method means adding
it there too.

## Anonymous

A throwaway session that can be upgraded later by linking a real credential onto
it. The address is `…@anonymous.invalid`, which is unroutable on purpose.

## Agent auth

API keys, not sessions. Mint one on the account page; the agent sends it as an
`x-api-key` header.

Keys are numbered, never named. The next key is one past the highest number in
use, so revoking key 2 doesn't hand the number out twice.

## Two-factor (TOTP)

A second factor rather than a sixteenth method: authenticator-app codes offered
after a password sign-in when the account has switched them on, from the account
page. Enabling and disabling both require the password — that's Better Auth's
rule, so an account without a password can't enrol.

It also covers the sign-in methods AussieAuth wrote itself. Better Auth's plugin
only gates the three paths it ships (`/sign-in/email`, `/sign-in/username`,
`/sign-in/phone-number`), which left a linked wallet or an account number as a
way in that never asked for the code. `convex/lib/twoFactorGate.ts` widens that
gate to `/sign-in/solana` and `/sign-in/account-number` — so once TOTP is on, it
is on for every door into the account, not just the one it was switched on
from.

Enrolment hands out backup codes once. Each works once, from the "use a backup
code" link on the challenge screen; a fresh set can be minted from the account
page (which invalidates the old one). The challenge offers "don't ask again on
this device for 30 days", which is Better Auth's trusted-device cookie.

The demo account can't enrol: `/two-factor/` is on the deny-list, for the same
reason it can't set a password.

## Sessions

The account page lists every live session with a coarse device label from the
User-Agent, and can end any session except the current one. "Sign out
everywhere" on the account header is the bulk version.

## Your data

The account page's footer card exports everything the server holds about you as
JSON — assembled client-side from the same endpoints the page already uses —
and can delete the account outright, password-confirmed. The demo account is
refused both ways.

## Apple

`https://appleid.apple.com` is a permanent trusted origin, because Apple returns
its callback as a form POST and the browser sends Apple's origin rather than ours.

## Email verification

Sent on sign-up, but never required to sign in.

It's there because linking checks it: attaching a social account to an existing
user also requires that _existing_ user's address to be verified, so without the
sign-up mail a credential user could never later add Google — they'd get "account
not linked" and no way forward.

The one-line alternative is `accountLinking.requireLocalEmailVerified: false`,
which opens the pre-registration attack: sign up under someone else's address,
wait for their Google sign-in to merge into your account.

## Rate limiting

On, and backed by the `rateLimit` table rather than memory. Both defaults were
wrong here:

- Better Auth enables rate limiting only when `NODE_ENV === "production"`, which a
  Convex deployment isn't — so the stock three-sign-ins-per-ten-seconds rule was
  off rather than merely loose.
- Its default memory store is a Map inside one HTTP-action isolate: not shared
  between concurrent requests, and gone when the isolate is recycled.

Matters most for account numbers, where the number is the entire credential and
there's no second factor to fall back on.

## Account linking

Signing in with Google and later with GitHub on the same address lands on one
account, not a duplicate-email error. `trustedProviders` is what makes that merge
happen at sign-in rather than only through an explicit link from the account page.

Only real provider ids belong there — it's matched against the _incoming_
account's providerId, so the credential provider is never a candidate.

## Questions

**Why can't the demo account set a password?**
Because it's shared. The first visitor to set one would own it, and everyone after
them would be locked into an account someone else controls.

**How many apps can share one passkey?**
Five distinct eTLD+1 labels, which is a WebAuthn limit rather than an AussieAuth
one. Several origins on one site cost one between them.

**Is there a recovery path for account numbers?**
No. That's the trade — no email, no password, nothing to phish, and nothing to
recover if you lose the number.

**Why does an anonymous user have an email address?**
The schema needs one. It's set to an unroutable `…@anonymous.invalid` address and
replaced if the user later links a real credential.
