import { apiKey } from "@better-auth/api-key";
import { expo } from "@better-auth/expo";
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
import { env } from "./_generated/server";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";
import { accountNumber } from "./lib/accountNumber";
import { appleClientSecret } from "./lib/apple";
import {
  appMethods,
  capToRelatedOriginLimit,
  RELATED_ORIGIN_LABEL_LIMIT,
  registeredOrigins,
  resolveApp,
} from "./lib/apps";
import { demo } from "./lib/demo";
import { linking } from "./lib/linking";
import { resolveLoginMethod } from "./lib/methods";
import { sendEmail, sendSms } from "./lib/notify";
import { solana } from "./lib/solana";
import { status } from "./lib/status";

/**
 * AussieAuth's own site — where the hosted sign-in page lives. Apps that use
 * AussieAuth never redirect here; this is only the default for links we email.
 */
const siteUrl = env.SITE_URL ?? "http://localhost:5173";

/**
 * Origins from the environment. These are the bootstrap set — this site and
 * whatever you're developing against — and they work with an empty `apps`
 * table, which is what a fresh checkout has.
 */
const envOrigins = (): string[] =>
  (env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o: string) => o.trim())
    .filter(Boolean);

const staticOrigins = [
  siteUrl,
  // Sign in with Apple posts its callback as a form, so the browser sends
  // Apple's origin rather than ours.
  "https://appleid.apple.com",
  ...envOrigins(),
];

/**
 * The origins allowed to use our passkeys, for `/.well-known/webauthn`.
 *
 * A passkey is bound to one relying party id (`aussieauth.com`), and a browser
 * normally refuses to let any other domain use it. Related Origin Requests is
 * the way out: we publish the list of origins that may, the browser fetches it
 * from the rpID's domain, and one passkey then works across all of them —
 * which is the whole point of a shared auth server.
 *
 * Apple's origin is not in here: it posts an OAuth callback, it never touches
 * WebAuthn.
 *
 * Native app schemes (`exp://`, `aussieauthios://`) are filtered out for the
 * same reason. A browser is the only thing that reads this file, it can only
 * act on web origins, and every entry costs against the five-label limit below
 * — so letting them through would push real origins off the end.
 */
export const relatedOrigins = async (ctx: GenericCtx<DataModel>) => {
  const all = [siteUrl, ...envOrigins(), ...(await registeredOrigins(ctx))]
    .filter((o) => /^https?:\/\//.test(o))
    .filter((o, i, xs) => xs.indexOf(o) === i);

  const { kept, dropped } = capToRelatedOriginLimit(all);
  if (dropped.length) {
    console.warn(
      `Related origins: dropped ${dropped.length} past the ${RELATED_ORIGIN_LABEL_LIMIT}-site WebAuthn limit — ${dropped.join(", ")}`,
    );
  }
  return kept;
};

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

/** Only register a social provider when its credentials are actually set. */
const socialProviders = () => {
  const providers: NonNullable<BetterAuthOptions["socialProviders"]> = {};
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    };
  }
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    };
  }
  // Apple wants the Services ID as the client id and a signed JWT as the
  // secret — see convex/lib/apple.ts for why we mint it per request.
  const { APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY } = env;
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
      appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER,
    });
  }
  return providers;
};

export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
  local: { schema: authSchema },
});

/**
 * Split out from `createAuth` so the component directory can read the options
 * without instantiating Better Auth — it has no access to env vars.
 */
export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    // Convex sets this one itself, so it isn't declared in convex.config.ts
    // and doesn't come through `env`.
    baseURL: process.env.CONVEX_SITE_URL,

    // Resolved per request rather than at construction, because apps register
    // themselves at runtime — the env list is only the bootstrap set. Better
    // Auth accepts an async resolver here, which is what makes a database-
    // backed allow-list possible at all.
    trustedOrigins: async () => [...staticOrigins, ...(await registeredOrigins(ctx))],

    database: authComponent.adapter(ctx),

    session: {
      additionalFields: {
        // Which app this session was created from. Not settable by the client
        // — it's derived from the request's origin below, so it can't be
        // spoofed by anyone who couldn't already forge the origin.
        appId: { type: "string", required: false, input: false },
      },
    },

    databaseHooks: {
      session: {
        create: {
          before: async (session, context) => {
            const app = await resolveApp(ctx, context?.headers?.get("origin"));
            if (!app) return;
            return { data: { ...session, appId: app.slug } };
          },
        },
      },
    },

    // Both fields are load-bearing, and both defaults were wrong for us:
    //
    // `enabled` defaults to `isProduction`, and NODE_ENV isn't "production" on
    // a Convex deployment — so the default 3-sign-ins-per-10s rule was off
    // rather than merely loose. Verified by hitting the endpoint six times.
    //
    // `storage` defaults to "memory", which here means a Map inside whichever
    // HTTP-action isolate served the request: not shared between concurrent
    // requests, and gone when the isolate is recycled. The component ships a
    // `rateLimit` table, so point at that and the counters survive.
    //
    // Matters most for `/sign-in/account-number`, where the number is the
    // entire credential and there's no second factor to fall back on.
    rateLimit: { enabled: true, storage: "database" },

    // Signing in with Google and later with GitHub on the same address should
    // land on one account, not a duplicate-email error. `trustedProviders` is
    // what makes that merge happen automatically at sign-in rather than only
    // through an explicit link from the account page.
    //
    // Only real provider ids belong here — it's matched against the *incoming*
    // account's providerId, so the credential provider is never a candidate.
    account: {
      accountLinking: {
        enabled: true,
        allowDifferentEmails: true,
        trustedProviders: ["google", "github", "apple"],
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
      // Load-bearing for account linking, not just hygiene.
      //
      // Linking an incoming social account onto an existing user also checks
      // the *existing* user (`requireLocalEmailVerified`, on by default). We
      // don't require verification to sign in, so without this a credential
      // user was never verified — sign up with email+password, later click
      // Google, and you'd hit "account not linked" with no way out.
      //
      // The alternative is `accountLinking.requireLocalEmailVerified: false`,
      // which is one line shorter and opens the pre-registration attack:
      // someone signs up with an address they don't own, and the real owner's
      // Google sign-in merges into their account. Sending the mail is cheaper
      // than that. Verification still isn't required to sign in, so this adds
      // an email, not a gate.
      sendOnSignUp: true,
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

      // Holds a registered app to the sign-in methods it asked for. Fails open
      // for origins no app has claimed — this site included.
      appMethods(ctx),

      // Which methods this deployment actually has credentials for, so the
      // sign-in card can badge the rest as "needs setup". Read per request,
      // because these options are also built where env vars aren't available.
      status(() => ({
        google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
        github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
        apple: Boolean(
          env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY,
        ),
        // Without these, codes and links go to the Convex logs instead.
        email: Boolean(env.RESEND_API_KEY),
        sms: Boolean(
          env.MOBILE_MESSAGE_API_USERNAME &&
          env.MOBILE_MESSAGE_API_PASSWORD &&
          env.MOBILE_MESSAGE_SENDER,
        ),
      })),

      // Native apps. Two jobs, both invisible from the web:
      //
      //  - React Native's fetch sends no `Origin`, so the client sends its
      //    deep-link scheme as `expo-origin` and this rewrites it back onto the
      //    request. Everything downstream that reads the origin — CSRF,
      //    `trustedOrigins`, `appMethods`, the session's `appId` — then works
      //    unchanged, which is why none of them needed a native special case.
      //
      //  - On an OAuth callback it appends the session cookie to the
      //    `myapp://` redirect, because a native app has no cookie jar the
      //    browser can write to.
      //
      // Ordered before `crossDomain` deliberately: both hook the same callback
      // paths, and the IdP's callback carries no `expo-origin` header (it comes
      // from Google, not from the app), so `crossDomain` does not skip itself
      // there the way it does elsewhere. Running first means the cookie is on
      // the redirect before `crossDomain` appends its one-time token.
      expo(),

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

export const createAuth = (ctx: GenericCtx<DataModel>) => betterAuth(createAuthOptions(ctx));
