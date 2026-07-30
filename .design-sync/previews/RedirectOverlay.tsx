import { RedirectOverlay, GoogleLogo } from "@aussieljk/auth";

// The full-screen cover shown the instant a social button is clicked, so the
// screen visibly hands off to the provider during the OAuth round-trip.
// Rendered inside a fixed-size card here (it's `position: fixed` in the app).

export const Google = () => (
  <div style={{ position: "relative", height: 240, width: 380 }}>
    <RedirectOverlay label="Google" icon={<GoogleLogo size={40} />} />
  </div>
);
