# AussieAuth (`@aussieljk/auth`)

A drop-in React sign-in card and its building blocks. AussieAuth renders a
themed authentication card that offers many sign-in methods (Google, GitHub,
Apple, email/username/phone + password, magic link, email/SMS OTP, passkey,
Solana wallet, demo, anonymous, account-number, agent). It's built on the
`ljkui` (frosted) component system.

## Setup / wrapping

Two ways to use the card:

- **`AussieAuthSignIn`** — the drop-in. It brings its own `ljkui` `<Theme>` and
  side-effect-imports its CSS, so you can render it with no other wiring. Theme
  it with `appearance` (`"light"` | `"dark"`), `accentColor`, and `grayColor`.

  ```tsx
  import { AussieAuthSignIn } from "@aussieljk/auth";

  <AussieAuthSignIn appName="Mango" accentColor="teal" />;
  ```

- **`SignIn`** — the same card WITHOUT its own theme. Use it when you already
  have an `ljkui` `<Theme>` around your app, for full control.

Anything that drives the auth client (the card, any `*Panel`) reads its client
from context. In a real app you call `createAussieAuthClient({ baseURL })` once
at your entry (or wrap in `<AussieAuthClientProvider client={...}>`); the
components use it automatically. For a static screen where nothing is clicked,
set **`respectRegistration={false}`** on the card so it draws a fixed method set
without probing the server.

Icons come from `ljkui`'s adapter system — register one once (e.g.
`import "ljkui/icons/lucide"`) or icon controls (the "forget account" trash)
render empty.

## Composition

- `<SignIn>`/`<AussieAuthSignIn>` props: `appName`, `methods` (ids, in order),
  `featured` (method ids shown as buttons up top — defaults to
  google/github/apple; pass `featured={[]}` for a form-only card), `primary`
  (the method whose form sits inline), `title`, `subtitle`, `logo`, `footer`,
  `notice`.
- **Method panels** (`GooglePanel`, `EmailPasswordPanel`, `MagicLinkPanel`,
  `EmailOtpPanel`, `AccountNumberPanel`, …) are the per-method building blocks
  the card composes inline. Render one on its own to offer a single method.
  Password/OTP panels take a `prefill` string.
- **Form primitives** compose a panel: `Field` (labelled input), `CodeField` /
  `CodeInput` (six-digit code), `Submit` (`pending` button), `BigButton`
  (full-width one-click w/ icon slot), `Feedback` (`error`/`notice` alert),
  `PanelForm` (the `<form>` wrapper), `Destructive` (danger icon-button).
- **Logos** (`GoogleLogo`, `GitHubLogo`, `AppleLogo`, `SolanaLogo`, `AgentLogo`)
  take a `size` prop.
- `RememberedAccounts` is the returning-account chooser (reads localStorage).

## Styling

Style through **`ljkui` props, not CSS classes** — the design language lives in
`<Theme>` (`appearance`, `accentColor`, `grayColor`) and in each `ljkui`
component's props. AussieAuth's own components expose focused props (above); for
your own layout glue around them, plain inline styles or a flex/grid wrapper are
fine. The token layer is `ljkui`'s `--fui-*` custom properties, injected at
runtime by `<Theme>` — don't hand-author those.

```tsx
import { AussieAuthSignIn } from "@aussieljk/auth";

export default function LoginScreen() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <AussieAuthSignIn
          appName="Mango"
          accentColor="teal"
          respectRegistration={false}
          featured={["google", "github", "apple"]}
          primary="email-password"
        />
      </div>
    </div>
  );
}
```
