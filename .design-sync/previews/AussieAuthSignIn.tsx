import { AussieAuthSignIn } from "@aussieljk/auth";

// The drop-in card is the product's centrepiece: a themed sign-in card that
// draws a button per method with one form inline. `respectRegistration={false}`
// pins a fixed method set so the card renders without probing a live server.

export const Default = () => (
  <div style={{ maxWidth: 460 }}>
    <AussieAuthSignIn appName="Mango" respectRegistration={false} />
  </div>
);

export const Featured = () => (
  <div style={{ maxWidth: 460 }}>
    <AussieAuthSignIn
      appName="Mango"
      respectRegistration={false}
      featured={["google", "github", "apple"]}
      primary="email-password"
      methods={["google", "github", "apple", "email-password", "magic-link", "passkey"]}
    />
  </div>
);

export const AccentTeal = () => (
  <div style={{ maxWidth: 460 }}>
    <AussieAuthSignIn
      appName="Reef"
      respectRegistration={false}
      accentColor="teal"
      methods={["google", "email-password", "magic-link"]}
      primary="email-password"
    />
  </div>
);

export const Minimal = () => (
  <div style={{ maxWidth: 460 }}>
    <AussieAuthSignIn
      appName="Solo"
      respectRegistration={false}
      methods={["email-password"]}
      primary="email-password"
      subtitle="Sign in with your email."
    />
  </div>
);
