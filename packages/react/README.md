# @aussieljk/auth

AussieAuth's drop-in React sign-in card and auth client. Point it at an
AussieAuth deployment and you get every sign-in method it supports — social,
password, passkey, wallet, magic link, OTP, anonymous — in one themed card.

```sh
bun add @aussieljk/auth
```

Requires React 19.

## Usage

Configure the client once at your app's entry, before any sign-in UI renders:

```ts
import { createAussieAuthClient } from "@aussieljk/auth";

export const authClient = createAussieAuthClient({
  baseURL: "https://your-deployment.convex.site",
  callbackURL: () => `${window.location.origin}/`,
});
```

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
    "scheme": "myapp"
  }
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

## Going lower-level

`AussieAuthSignIn` is `SignIn` wrapped in its own `<Theme>`. For full control
over theming or layout, import `SignIn` directly, or compose your own card from
the exported building blocks (`panels`, `ui`, `RememberedAccounts`, the method
registry, and the `useRunner` / `useRemoteList` / `useSetupStatus` hooks).
