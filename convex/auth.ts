import { apiKey } from "@better-auth/api-key";
import { getAuthenticatorName, passkey } from "@better-auth/passkey";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import {
  anonymous,
  emailOTP,
  lastLoginMethod,
  magicLink,
  oneTap,
  phoneNumber,
  username,
} from "better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";
import { accountNumber } from "./lib/accountNumber";
import { appleClientSecret } from "./lib/apple";
import { demo } from "./lib/demo";
import { linking } from "./lib/linking";
import { sendEmail, sendSms } from "./lib/notify";
import { solana } from "./lib/solana";

/**
 * AussieAuth's own site — where the hosted sign-in page lives. Apps that use
 * AussieAuth never redirect here; this is only the default for links we email.
 */
const siteUrl = process.env.SITE_URL ?? "http://localhost:5173";

/**
 * Every origin allowed to drive this auth server directly. Consumer apps go in
 * here (comma separated) and then talk to AussieAuth from their own domain —
 * which is what keeps them from ever showing a second consent screen.
 */
const trustedOrigins = [
  siteUrl,
  // Sign in with Apple posts its callback as a form, so the browser sends
  // Apple's origin rather than ours.
  "https://appleid.apple.com",
  ...(process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
];

const hostname = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "localhost";
  }
};

/**
 * "Safari on macOS" from a User-Agent string — the fallback label for a
 * passkey whose authenticator didn't identify itself. Deliberately coarse:
 * it only has to tell two of your devices apart in a list.
 */
const describeClient = (ua: string | null | undefined) => {
  if (!ua) return "Passkey";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : null;
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os ?? "Passkey";
};

/**
 * Which of our sixteen methods a request represents. The stock resolver only
 * knows the handful Better Auth ships, and answers in its own vocabulary; this
 * covers every endpoint and answers in `PROVIDERS` ids, so the sign-in screen
 * can offer a returning account the exact button it used last time.
 */
const LOGIN_METHOD_PATHS: Record<string, string> = {
  "/sign-in/email": "email-password",
  "/sign-up/email": "email-password",
  "/sign-in/username": "username-password",
  "/sign-in/phone-number": "phone-password",
  "/phone-number/verify": "ios-otp",
  "/sign-in/email-otp": "email-otp",
  "/magic-link/verify": "magic-link",
  "/passkey/verify-authentication": "passkey",
  "/sign-in/solana": "solana",
  "/sign-in/anonymous": "anonymous",
  "/sign-in/demo": "demo",
  "/sign-in/account-number": "account-number",
  "/sign-up/account-number": "account-number",
  "/one-tap/callback": "google-one-tap",
};

const resolveLoginMethod = (ctx: { path?: string; params?: unknown }) => {
  const path = ctx.path;
  if (!path) return null;
  if (path.startsWith("/callback/") || path.startsWith("/oauth2/callback/")) {
    const params = ctx.params as
      { id?: string; providerId?: string } | undefined;
    return params?.id ?? params?.providerId ?? path.split("/").pop() ?? null;
  }
  return LOGIN_METHOD_PATHS[path] ?? null;
};

/** Only register a social provider when its credentials are actually set. */
const socialProviders = () => {
  const providers: NonNullable<BetterAuthOptions["socialProviders"]> = {};
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    };
  }
  // Apple wants the Services ID as the client id and a signed JWT as the
  // secret — see convex/lib/apple.ts for why we mint it per request.
  const { APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY } =
    process.env;
  if (APPLE_CLIENT_ID && APPLE_TEAM_ID && APPLE_KEY_ID && APPLE_PRIVATE_KEY) {
    providers.apple = async () => ({
      clientId: APPLE_CLIENT_ID,
      clientSecret: await appleClientSecret({
        clientId: APPLE_CLIENT_ID,
        teamId: APPLE_TEAM_ID,
        keyId: APPLE_KEY_ID,
        privateKey: APPLE_PRIVATE_KEY,
      }),
      // Apple only accepts return URLs on a domain registered to the Services
      // ID, and the Convex hostname isn't one. vercel.json proxies this path
      // back here; every other provider still calls the deployment directly.
      redirectURI: `${siteUrl}/api/auth/callback/apple`,
      // Only used by native iOS apps signing in with an id token.
      appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER,
    });
  }
  return providers;
};

export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  {
    local: { schema: authSchema },
  },
);

/**
 * Split out from `createAuth` so the component directory can read the options
 * without instantiating Better Auth — it has no access to env vars.
 */
export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    baseURL: process.env.CONVEX_SITE_URL,
    trustedOrigins,
    database: authComponent.adapter(ctx),

    // Signing in with Google and later with GitHub on the same address should
    // land on one account, not a duplicate-email error. `trustedProviders` is
    // what makes that merge happen automatically at sign-in rather than only
    // through an explicit link from the account page.
    account: {
      accountLinking: {
        enabled: true,
        allowDifferentEmails: true,
        trustedProviders: ["google", "github", "apple", "email-password"],
      },
    },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Reset your AussieAuth password",
          text: `Reset your password:\n\n${url}`,
        });
      },
    },

    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Verify your email",
          text: `Confirm your address:\n\n${url}`,
        });
      },
    },

    socialProviders: socialProviders(),

    plugins: [
      // Email/username/phone credentials.
      username(),
      phoneNumber({
        sendOTP: async ({ phoneNumber, code }) => {
          await sendSms({
            to: phoneNumber,
            body: `${code} is your AussieAuth code`,
          });
        },
        signUpOnVerification: {
          // A phone-only user still needs an email column; keep it unroutable.
          getTempEmail: (phone) => `${phone.replace(/\D/g, "")}@phone.invalid`,
          getTempName: (phone) => phone,
        },
      }),

      // Passwordless.
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          await sendEmail({
            to: email,
            subject: "Your AussieAuth sign-in link",
            text: `Sign in:\n\n${url}`,
          });
        },
      }),
      emailOTP({
        // Six digits, so iOS Passwords / Android autofill can pick it out of
        // the message and offer it to an autocomplete="one-time-code" field.
        otpLength: 6,
        sendVerificationOTP: async ({ email, otp }) => {
          await sendEmail({
            to: email,
            subject: `${otp} is your AussieAuth code`,
            text: `Your AussieAuth code is ${otp}. It expires in 5 minutes.`,
          });
        },
      }),
      passkey({
        rpID: hostname(siteUrl),
        rpName: "AussieAuth",
        registration: {
          // Nobody should have to name their own passkey. The authenticator
          // says what it is in the AAGUID; when it doesn't (Apple zeroes it
          // under `attestation: "none"`) the browser's UA is the next best
          // description of where the key ended up.
          afterVerification: ({ ctx, verification }) => ({
            name:
              getAuthenticatorName(verification.registrationInfo?.aaguid) ??
              describeClient(ctx.headers?.get("user-agent")),
          }),
        },
      }),
      oneTap(),

      // Wallet.
      solana({ domain: hostname(siteUrl) }),

      // No account needed.
      anonymous({ emailDomainName: "anonymous.invalid" }),
      accountNumber(),
      demo(),

      // Machine.
      apiKey({ defaultPrefix: "aussie_" }),

      // Growing one account extra credentials rather than making a new user.
      linking(),
      // Recorded on the user row (not just a cookie) so the sign-in screen can
      // offer a returning account the method it actually used last time.
      lastLoginMethod({
        storeInDatabase: true,
        customResolveMethod: resolveLoginMethod,
      }),

      crossDomain({ siteUrl }),
      convex({ authConfig }),
    ],
  }) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));
