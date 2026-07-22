# AussieAuth

A minimal Convex + Convex Auth starter: email/password sign-up, sign-in, and
sign-out, and nothing else. React + Vite on the front, frosted-ui for the form.

## Setup

```sh
bun install
bunx convex dev        # creates the Convex project, writes .env.local
```

Convex Auth needs a signing keypair. In a second terminal (leave `convex dev`
running):

```sh
bunx @convex-dev/auth  # generates and sets JWT_PRIVATE_KEY + JWKS
bunx convex env set SITE_URL https://aussieauth.localhost
bun dev
```

`bun dev` runs vite through [portless](https://github.com/tobias-tengler/portless),
which serves the app at `https://aussieauth.localhost`. Keep `SITE_URL` in sync
with whatever origin you actually load — it's what Convex Auth uses for
redirects.

## How it fits together

- `convex/auth.ts` — `convexAuth()` with the `Password` provider. A custom
  `profile` captures a name on sign-up. Also exports `requireUserId`, the
  helper your own functions should use to scope data to a user.
- `convex/auth.config.ts` — points Convex at its own site URL as the JWT
  issuer. Without this, `ctx.auth.getUserIdentity()` is always `null`.
- `convex/http.ts` — mounts the auth routes.
- `convex/schema.ts` — spreads `authTables`. Add your tables here.
- `src/main.tsx` — `ConvexAuthProvider` wraps the app; the client is created
  with `expectAuth: true` so queries wait for the token.
- `src/App.tsx` — `<Authenticated>` / `<Unauthenticated>` around a form that
  calls `signIn("password", { email, password, flow })`.

## Adding user-owned data

Store `Id<"users">` on your documents, not `identity.tokenIdentifier` — under
Convex Auth the token identifier embeds the session id, so it changes on every
sign-in and is useless as an owner key.

```ts
import { requireUserId } from "./auth";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("things")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .collect();
  },
});
```

## Gotcha worth knowing

`frosted-ui`'s `Button` wraps Base UI, which defaults native buttons to
`type="button"`. Inside a `<form>` you must pass `type="submit"` explicitly or
`onSubmit` never fires.
