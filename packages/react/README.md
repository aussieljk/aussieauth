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

## Options

`createAussieAuthClient(options)`

| Option        | Type                       | Notes                                                                     |
| ------------- | -------------------------- | ------------------------------------------------------------------------- |
| `baseURL`     | `string`                   | The deployment's `.convex.site` origin. Required.                         |
| `callbackURL` | `string \| (() => string)` | Where a provider returns the user. Defaults to the current origin's root. |

It returns the configured Better Auth client — pass it straight to
`ConvexBetterAuthProvider`.

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
