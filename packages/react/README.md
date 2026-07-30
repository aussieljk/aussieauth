# @aussieljk/auth

AussieAuth's drop-in React sign-in card and auth client. Point it at an
AussieAuth deployment and you get every sign-in method it supports — social,
password, passkey, wallet, magic link, OTP, anonymous — in one themed card.

```sh
bun add @aussieljk/auth
```

Requires React 19.

## Usage

```sh
bunx aussieauth init
```

Detects the framework (Vite, Next, TanStack Start, Expo), writes the provider
and a sign-in route, derives the deployment URL from the project's own
`.env.local`, and registers the dev origin — so `localhost` works before you've
read anything about origins.

### With Convex

```tsx
import { AussieAuthProvider } from "@aussieljk/auth/convex";
import "@aussieljk/auth/styles.css";

<AussieAuthProvider>{children}</AussieAuthProvider>;
```

One provider: the AussieAuth client, the Convex client, and the context the
card reads its client from. URLs come from `VITE_CONVEX_URL` /
`NEXT_PUBLIC_CONVEX_URL` (and `*_AUSSIEAUTH_URL`, derived from the Convex URL
when unset); pass `authUrl`, `convexUrl`, `authClient` or `convexClient` to
override any of them.

It's a separate subpath because the root entry imports no Convex — the card
talks to the auth server over plain HTTP, so it works in apps that have none.

### Without Convex

Configure the client once at your app's entry, before any sign-in UI renders:

```ts
import { createAussieAuthClient } from "@aussieljk/auth";

export const authClient = createAussieAuthClient({
  baseURL: "https://your-deployment.convex.site",
  callbackURL: () => `${window.location.origin}/`,
});
```

> `.convex.site`, not `.convex.cloud`. Both are real URLs for the same
> deployment and only the first serves auth; the second fails as
> `TypeError: Failed to fetch` with no body to explain itself.

Then drop the card wherever you want people to sign in:

```tsx
import { AussieAuthSignIn } from "@aussieljk/auth";

<AussieAuthSignIn
  appName="My App"
  featured={["google", "github", "apple"]}
  primary="email-password"
  accentColor="indigo"
/>;
```

The card ships its own styles and `@aussieljk/frosted` theme, so it renders
correctly without any CSS wiring on your side.

### More than one deployment

`createAussieAuthClient` registers the client the card uses, which is all one
app needs. If you have two — a staging deployment alongside production, or two
surfaces returning to different places — wrap each tree in a provider instead
and the components below it use that client:

```tsx
import { AussieAuthClientProvider, AussieAuthSignIn } from "@aussieljk/auth";

<AussieAuthClientProvider client={staging} callbackURL="https://staging.example.com/">
  <AussieAuthSignIn appName="My App (staging)" />
</AussieAuthClientProvider>;
```

`useAuthClient()` is the hook the card uses, and it's exported for your own
components. With no provider mounted it falls back to whatever
`createAussieAuthClient` configured — so adding one is optional, and never a
breaking change.

## Options

`createAussieAuthClient(options)`

| Option        | Type                       | Notes                                                                     |
| ------------- | -------------------------- | ------------------------------------------------------------------------- |
| `baseURL`     | `string`                   | The deployment's `.convex.site` origin. Required.                         |
| `callbackURL` | `string \| (() => string)` | Where a provider returns the user. Defaults to the current origin's root. |

It returns the configured Better Auth client — pass it straight to
`ConvexBetterAuthProvider`.

## Expo / React Native

AussieAuth ships native-aware Expo helpers: a client factory, a Convex provider,
route guards, a native sign-in card, and a CLI initializer.

```sh
npx expo install expo-secure-store expo-web-browser
bun add @aussieljk/auth @better-auth/expo
bunx aussieauth init expo --scheme myapp
```

```ts
// lib/auth-client.ts
import { createAussieAuthExpoClient } from "@aussieljk/auth/expo";
import * as SecureStore from "expo-secure-store";

export const authClient = createAussieAuthExpoClient({
  baseURL: process.env.EXPO_PUBLIC_AUSSIEAUTH_URL!,
  scheme: "myapp",
  storage: SecureStore,
});
```

```tsx
// app/_layout.tsx
import { AussieAuthProvider } from "@aussieljk/auth/expo";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";

export default function Layout() {
  return (
    <AussieAuthProvider scheme="myapp" storage={SecureStore}>
      <Stack />
    </AussieAuthProvider>
  );
}
```

```tsx
// app/sign-in.tsx
import { AussieAuthNativeSignIn } from "@aussieljk/auth/native";
import { router } from "expo-router";
import { authClient } from "../lib/auth-client";

export default function SignIn() {
  return <AussieAuthNativeSignIn authClient={authClient} onSignedIn={() => router.replace("/")} />;
}
```

Set the same scheme in `app.json` / `app.config.ts`, then register the scheme
origin:

```jsonc
{
  "expo": {
    "scheme": "myapp",
  },
}
```

```sh
bunx aussieauth apps register --auth-url "$EXPO_PUBLIC_AUSSIEAUTH_URL" --secret "$AUSSIEAUTH_SECRET" --slug myapp --name "My App" --scheme myapp --dev-exp
```

`<AussieAuthSignIn>`

| Prop                                       | Type         | Notes                                                 |
| ------------------------------------------ | ------------ | ----------------------------------------------------- |
| `appName`                                  | `string`     | Drives the default heading.                           |
| `methods`                                  | `string[]`   | Method ids to offer, in order. Defaults to all.       |
| `featured`                                 | `string[]`   | Method ids shown as buttons on the front of the card. |
| `primary`                                  | `string`     | The method whose form sits inline under the buttons.  |
| `title` / `subtitle`                       | `string`     | Override the default copy.                            |
| `logo` / `footer`                          | `ReactNode`  | A mark above the heading; a line at the foot.         |
| `appearance` / `accentColor` / `grayColor` | theme tokens | Basic branding.                                       |

## Testing without a deployment

```tsx
import { AussieAuthSignIn } from "@aussieljk/auth";
import { MockApi, workingDeployment } from "@aussieljk/auth/testing";

<MockApi handlers={workingDeployment}>
  <AussieAuthSignIn appName="My App" />
</MockApi>;
```

MSW handlers for every endpoint the card touches plus the wrapper that boots
them, so the card renders in tests, in Storybook, or in a sandbox with no
backend. `appWithMethods([...])` and `mountHandlers.appUnregistered` cover the
allow-list and unregistered-origin states. `msw` is an optional peer
dependency.

## Errors

Every failure the card shows is translated first, so the failures that account
for most broken integrations arrive with a command in them:

- an unregistered origin names itself and the `apps register` line that fixes it
- a method outside the app's allow-list names the methods that _are_ registered
- a missing provider credential names the exact environment variables
- a `.convex.cloud` base URL is called out by name

`explainAussieAuthError(error, ctx)` and its awaitable twin
`diagnoseAussieAuthError` are exported for your own UI. The card also reads
`/apps/me` on mount and draws only the methods your app registered — pass
`respectRegistration={false}` to opt out.

## CLI

```sh
aussieauth init                      # scaffold into this app
aussieauth apps register --slug my-app --origin https://my-app.com
aussieauth apps unregister --slug my-app   # dry run; --confirm to mean it
aussieauth apps show --origin https://my-app.com
```

`apps register` warns when an origin lands past WebAuthn's five-site
related-origins limit, which is otherwise a silent passkey failure.
`apps unregister` prints what it would revoke and asks you to type the slug
back; the app's method list survives the revoke, so re-registering restores it.

## Going lower-level

`AussieAuthSignIn` is `SignIn` wrapped in its own `<Theme>`. For full control
over theming or layout, import `SignIn` directly, or compose your own card from
the exported building blocks (`panels`, `ui`, `RememberedAccounts`, the method
registry, and the `useRunner` / `useRemoteList` / `useSetupStatus` hooks).
