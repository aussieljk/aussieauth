/**
 * Auth provider marks.
 *
 * Brand logos are lifted from svgl.app. Methods that aren't a brand (passkey,
 * magic link, OTP, anonymous, …) get a line icon drawn here in `currentColor`
 * so they inherit whatever the surrounding frosted-ui text colour is.
 *
 * Every mark renders into a 1em box and is sized by the caller via `size`.
 */

type LogoProps = {
  size?: number;
  className?: string;
};

function svgProps({ size = 20, className }: LogoProps) {
  return {
    width: size,
    height: size,
    className,
    "aria-hidden": true,
    focusable: false as const,
  };
}

/** Shared stroke settings for the hand-drawn line icons. */
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* ─────────────────────────── brand logos ─────────────────────────── */

export function GoogleLogo(props: LogoProps) {
  return (
    <svg {...svgProps(props)} viewBox="0 0 256 262">
      <path
        fill="#4285F4"
        d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
      />
      <path
        fill="#34A853"
        d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
      />
      <path
        fill="#FBBC05"
        d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"
      />
      <path
        fill="#EB4335"
        d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
      />
    </svg>
  );
}

/** The One Tap chip reuses the Google mark — the difference is the flow, not the brand. */
export const GoogleOneTapLogo = GoogleLogo;

export function GitHubLogo(props: LogoProps) {
  return (
    <svg {...svgProps(props)} viewBox="0 0 1024 1024">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M512 0C229.12 0 0 229.12 0 512c0 226.56 146.56 417.92 350.08 485.76 25.6 4.48 35.2-10.88 35.2-24.32 0-12.16-.64-52.48-.64-95.36-128.64 23.68-161.92-31.36-172.16-60.16-5.76-14.72-30.72-60.16-52.48-72.32-17.92-9.6-43.52-33.28-.64-33.92 40.32-.64 69.12 37.12 78.72 52.48 46.08 77.44 119.68 55.68 149.12 42.24 4.48-33.28 17.92-55.68 32.64-68.48-113.92-12.8-232.96-56.96-232.96-252.8 0-55.68 19.84-101.76 52.48-137.6-5.12-12.8-23.04-65.28 5.12-135.68 0 0 42.88-13.44 140.8 52.48 40.96-11.52 84.48-17.28 128-17.28s87.04 5.76 128 17.28c97.92-66.56 140.8-52.48 140.8-52.48 28.16 70.4 10.24 122.88 5.12 135.68 32.64 35.84 52.48 81.28 52.48 137.6 0 196.48-119.68 240-233.6 252.8 18.56 16 34.56 46.72 34.56 94.72 0 68.48-.64 123.52-.64 140.8 0 13.44 9.6 29.44 35.2 24.32C877.44 929.92 1024 737.92 1024 512 1024 229.12 794.88 0 512 0"
      />
    </svg>
  );
}

export function AppleLogo(props: LogoProps) {
  return (
    <svg {...svgProps(props)} viewBox="0 0 814 1000">
      <path
        fill="currentColor"
        d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"
      />
    </svg>
  );
}

export function SolanaLogo(props: LogoProps) {
  // svgl ships this with gradient ids a/b/c — namespaced here so they can't
  // collide with anything else on the page.
  return (
    <svg {...svgProps(props)} viewBox="0 0 36 36">
      <defs>
        <linearGradient
          x1="90.737%"
          y1="34.776%"
          x2="35.509%"
          y2="55.415%"
          id="sol-grad-a"
        >
          <stop stopColor="#00FFA3" offset="0%" />
          <stop stopColor="#DC1FFF" offset="100%" />
        </linearGradient>
        <linearGradient
          x1="66.588%"
          y1="43.8%"
          x2="11.36%"
          y2="64.439%"
          id="sol-grad-b"
        >
          <stop stopColor="#00FFA3" offset="0%" />
          <stop stopColor="#DC1FFF" offset="100%" />
        </linearGradient>
        <linearGradient
          x1="78.586%"
          y1="39.317%"
          x2="23.358%"
          y2="59.956%"
          id="sol-grad-c"
        >
          <stop stopColor="#00FFA3" offset="0%" />
          <stop stopColor="#DC1FFF" offset="100%" />
        </linearGradient>
      </defs>
      <g fill="none" fillRule="nonzero">
        <circle fill="#181E33" cx="18" cy="18" r="18" />
        <path
          d="M3.9 14.355a.785.785 0 0 1 .554-.23h19.153c.35 0 .525.423.277.67l-3.783 3.784a.785.785 0 0 1-.555.23H.393a.392.392 0 0 1-.277-.67l3.783-3.784z"
          fill="url(#sol-grad-a)"
          transform="translate(6 9)"
        />
        <path
          d="M3.9.23c.15-.146.35-.23.554-.23h19.153c.35 0 .525.422.277.67l-3.783 3.783a.785.785 0 0 1-.555.23H.393a.392.392 0 0 1-.277-.67L3.899.229z"
          fill="url(#sol-grad-b)"
          transform="translate(6 9)"
        />
        <path
          d="M20.1 7.247a.785.785 0 0 0-.554-.23H.393a.392.392 0 0 0-.277.67l3.783 3.784c.145.145.344.23.555.23h19.153c.35 0 .525-.423.277-.67l-3.783-3.784z"
          fill="url(#sol-grad-c)"
          transform="translate(6 9)"
        />
      </g>
    </svg>
  );
}

/** Agent auth is an AI-agent flow, so it wears the Claude mark. */
export function AgentLogo(props: LogoProps) {
  return (
    <svg {...svgProps(props)} viewBox="0 0 256 257">
      <path
        fill="#D97757"
        d="m50.228 170.321 50.357-28.257.843-2.463-.843-1.361h-2.462l-8.426-.518-28.775-.778-24.952-1.037-24.175-1.296-6.092-1.297L0 125.796l.583-3.759 5.12-3.434 7.324.648 16.202 1.101 24.304 1.685 17.629 1.037 26.118 2.722h4.148l.583-1.685-1.426-1.037-1.101-1.037-25.147-17.045-27.22-18.017-14.258-10.37-7.713-5.25-3.888-4.925-1.685-10.758 7-7.713 9.397.649 2.398.648 9.527 7.323 20.35 15.75L94.817 91.9l3.889 3.24 1.555-1.102.195-.777-1.75-2.917-14.453-26.118-15.425-26.572-6.87-11.018-1.814-6.61c-.648-2.723-1.102-4.991-1.102-7.778l7.972-10.823L71.42 0 82.05 1.426l4.472 3.888 6.61 15.101 10.694 23.786 16.591 32.34 4.861 9.592 2.592 8.879.973 2.722h1.685v-1.556l1.36-18.211 2.528-22.36 2.463-28.776.843-8.1 4.018-9.722 7.971-5.25 6.222 2.981 5.12 7.324-.713 4.73-3.046 19.768-5.962 30.98-3.889 20.739h2.268l2.593-2.593 10.499-13.934 17.628-22.036 7.778-8.749 9.073-9.657 5.833-4.601h11.018l8.1 12.055-3.628 12.443-11.342 14.388-9.398 12.184-13.48 18.147-8.426 14.518.778 1.166 2.01-.194 30.46-6.481 16.462-2.982 19.637-3.37 8.88 4.148.971 4.213-3.5 8.62-20.998 5.184-24.628 4.926-36.682 8.685-.454.324.519.648 16.526 1.555 7.065.389h17.304l32.21 2.398 8.426 5.574 5.055 6.805-.843 5.184-12.962 6.611-17.498-4.148-40.83-9.721-14-3.5h-1.944v1.167l11.666 11.406 21.387 19.314 26.767 24.887 1.36 6.157-3.434 4.86-3.63-.518-23.526-17.693-9.073-7.972-20.545-17.304h-1.36v1.814l4.73 6.935 25.017 37.59 1.296 11.536-1.814 3.76-6.481 2.268-7.13-1.297-14.647-20.544-15.1-23.138-12.185-20.739-1.49.843-7.194 77.448-3.37 3.953-7.778 2.981-6.48-4.925-3.436-7.972 3.435-15.749 4.148-20.544 3.37-16.333 3.046-20.285 1.815-6.74-.13-.454-1.49.194-15.295 20.999-23.267 31.433-18.406 19.702-4.407 1.75-7.648-3.954.713-7.064 4.277-6.286 25.47-32.405 15.36-20.092 9.917-11.6-.065-1.686h-.583L44.07 198.125l-12.055 1.555-5.185-4.86.648-7.972 2.463-2.593 20.35-13.999-.064.065Z"
      />
    </svg>
  );
}

/* ───────────────────────── line icons ───────────────────────── */

export function PasskeyLogo(props: LogoProps) {
  return (
    <svg {...svgProps(props)} viewBox="0 0 24 24">
      <circle {...stroke} cx="9.5" cy="7.5" r="3.5" />
      <path {...stroke} d="M3 20c0-3.3 2.9-5.5 6.5-5.5 1 0 1.9.2 2.7.5" />
      <circle {...stroke} cx="17" cy="14" r="3" />
      <path {...stroke} d="M17 17v4l1.5 1.2L17 23.5" />
    </svg>
  );
}

export function MailLogo(props: LogoProps) {
  return (
    <svg {...svgProps(props)} viewBox="0 0 24 24">
      <rect {...stroke} x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path {...stroke} d="m3.5 7 7.3 5.2a2 2 0 0 0 2.4 0L20.5 7" />
    </svg>
  );
}

export function PhoneLogo(props: LogoProps) {
  return (
    <svg {...svgProps(props)} viewBox="0 0 24 24">
      <rect {...stroke} x="6" y="2" width="12" height="20" rx="2.6" />
      <path {...stroke} d="M10.5 5.5h3" />
      <circle fill="currentColor" cx="12" cy="18.3" r="1" />
    </svg>
  );
}

export function UsernameLogo(props: LogoProps) {
  return (
    <svg {...svgProps(props)} viewBox="0 0 24 24">
      <circle {...stroke} cx="12" cy="12" r="4" />
      <path
        {...stroke}
        d="M16 8v5a2.5 2.5 0 0 0 5 0v-1a9 9 0 1 0-3.6 7.2"
      />
    </svg>
  );
}

export function MagicLinkLogo(props: LogoProps) {
  return (
    <svg {...svgProps(props)} viewBox="0 0 24 24">
      <path {...stroke} d="M4 20 15 9" />
      <path {...stroke} d="M13.5 4.5 14 6.5 16 7l-2 .5-.5 2-.5-2L11 7l2-.5z" />
      <path
        {...stroke}
        d="M19 10.5l.4 1.6 1.6.4-1.6.4-.4 1.6-.4-1.6-1.6-.4 1.6-.4z"
      />
      <path {...stroke} d="M13 7.5 16.5 11" />
    </svg>
  );
}

export function EmailOtpLogo(props: LogoProps) {
  return (
    <svg {...svgProps(props)} viewBox="0 0 24 24">
      <rect {...stroke} x="2.5" y="4.5" width="19" height="12" rx="2.5" />
      <path {...stroke} d="m3.5 6.5 7.3 5.2a2 2 0 0 0 2.4 0l7.3-5.2" />
      <path {...stroke} d="M8 20h2M13 20h3" />
    </svg>
  );
}

export function IosPasswordsLogo(props: LogoProps) {
  return (
    <svg {...svgProps(props)} viewBox="0 0 24 24">
      <rect {...stroke} x="6" y="2" width="12" height="20" rx="2.6" />
      <rect {...stroke} x="9" y="10" width="6" height="5" rx="1.2" />
      <path {...stroke} d="M10.3 10V8.6a1.7 1.7 0 0 1 3.4 0V10" />
    </svg>
  );
}

export function DemoLogo(props: LogoProps) {
  return (
    <svg {...svgProps(props)} viewBox="0 0 24 24">
      <path {...stroke} d="M9 6.5 18.5 12 9 17.5z" />
      <circle {...stroke} cx="12" cy="12" r="9.5" />
    </svg>
  );
}

export function AnonymousLogo(props: LogoProps) {
  return (
    <svg {...svgProps(props)} viewBox="0 0 24 24">
      <path
        {...stroke}
        d="M5 20V10a7 7 0 0 1 14 0v10l-2.3-1.6L14.4 20l-2.4-1.6L9.6 20l-2.3-1.6z"
      />
      <circle fill="currentColor" cx="9.5" cy="10.5" r="1.2" />
      <circle fill="currentColor" cx="14.5" cy="10.5" r="1.2" />
    </svg>
  );
}

/** Mullvad-style: no email, no name — just a generated account number. */
export function AccountNumberLogo(props: LogoProps) {
  return (
    <svg {...svgProps(props)} viewBox="0 0 24 24">
      <path {...stroke} d="M9 3.5 7.5 20.5M16.5 3.5 15 20.5" />
      <path {...stroke} d="M3.5 9h17M3.5 15h17" />
    </svg>
  );
}
