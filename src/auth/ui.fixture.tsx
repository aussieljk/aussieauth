import { GoogleLogo, SolanaLogo } from "./logos";
import { BigButton, CodeField, Feedback, Field } from "./ui";

const noop = () => {};

export default {
  "Field / email": (
    <Field label="Email" type="email" placeholder="you@example.com" autoComplete="username" />
  ),
  "Field / password": <Field label="Password" type="password" autoComplete="current-password" />,
  "Field / prefilled": <Field label="Name" value="Lucas" readOnly />,

  "Code field / empty": <CodeField />,
  "Code field / filled": <CodeField value="123456" readOnly />,

  "Feedback / error": <Feedback error="Invalid email or password" />,
  "Feedback / notice": (
    <Feedback notice="Link sent to you@example.com. It's good for one sign-in." />
  ),
  /** Both set: the error wins, since it's the thing you have to act on. */
  "Feedback / error wins": <Feedback error="That code has expired" notice="Code sent." />,

  "Big button / with logo": (
    <BigButton icon={<GoogleLogo size={18} />} onClick={noop}>
      Continue with Google
    </BigButton>
  ),
  /** Methods without a brand mark still line up — the icon slot is fixed-width. */
  "Big button / no logo": <BigButton onClick={noop}>Continue anonymously</BigButton>,
  "Big button / wallet": (
    <BigButton icon={<SolanaLogo size={18} />} onClick={noop}>
      Connect wallet
    </BigButton>
  ),
  "Big button / pending": (
    <BigButton pending onClick={noop}>
      Continue with Google
    </BigButton>
  ),
};
