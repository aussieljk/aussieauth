import { SignIn } from "@aussieljk/auth";

// The sign-in card without its own <Theme> wrapper — themes off whatever
// ljkui theme is around it. Use this for full control; use AussieAuthSignIn
// for the drop-in that brings its own theme.

export const Default = () => (
  <div style={{ maxWidth: 460 }}>
    <SignIn appName="Mango" respectRegistration={false} />
  </div>
);

export const WithNotice = () => (
  <div style={{ maxWidth: 460 }}>
    <SignIn
      appName="Mango"
      respectRegistration={false}
      methods={["google", "github", "email-password"]}
      primary="email-password"
      notice="Your session expired — sign back in to continue."
    />
  </div>
);

export const PasswordOnly = () => (
  <div style={{ maxWidth: 460 }}>
    <SignIn
      appName="Ledger"
      respectRegistration={false}
      featured={[]}
      methods={["email-password"]}
      primary="email-password"
      subtitle="Sign in with your email and password."
    />
  </div>
);
