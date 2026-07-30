import { BigButton, GoogleLogo } from "@aussieljk/auth";

// A full-width one-click method button, with a fixed icon slot so labels line
// up whether or not there's a mark.

export const WithIcon = () => (
  <div style={{ maxWidth: 380 }}>
    <BigButton icon={<GoogleLogo size={18} />} onClick={() => {}}>
      Continue with Google
    </BigButton>
  </div>
);

export const NoIcon = () => (
  <div style={{ maxWidth: 380 }}>
    <BigButton onClick={() => {}}>Continue as a guest</BigButton>
  </div>
);
