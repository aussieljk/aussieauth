import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import {
  anonymous,
  emailOTP,
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
    // land on one account, not a duplicate-email error.
    account: {
      accountLinking: { enabled: true, allowDifferentEmails: true },
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

      crossDomain({ siteUrl }),
      convex({ authConfig }),
    ],
  }) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));
