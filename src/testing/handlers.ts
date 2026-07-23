import { http, HttpResponse } from "msw";

/**
 * Better Auth talks to `${baseURL}/api/auth/...`, and with no
 * `VITE_CONVEX_SITE_URL` in the workbench that resolves to this origin.
 * Handlers are keyed by the flow a fixture exercises — no catch-alls.
 */

const auth = (path: string) => `*/api/auth/${path}`;

const session = {
  token: "fixture-session",
  user: {
    id: "user_fixture",
    email: "lucas@example.com",
    name: "Lucas",
    emailVerified: true,
  },
};

const failure = (message: string, status = 401) =>
  HttpResponse.json({ message, code: "FIXTURE" }, { status });

export const handlers = {
  signInSuccess: [
    http.post(auth("sign-in/email"), () => HttpResponse.json(session)),
    http.post(auth("sign-up/email"), () => HttpResponse.json(session)),
  ],
  signInFailure: [
    http.post(auth("sign-in/email"), () => failure("Invalid email or password")),
  ],
  magicLink: [
    http.post(auth("sign-in/magic-link"), () => HttpResponse.json({ status: true })),
  ],
  emailOtp: [
    http.post(auth("email-otp/send-verification-otp"), () =>
      HttpResponse.json({ success: true }),
    ),
    http.post(auth("sign-in/email-otp"), () => HttpResponse.json(session)),
  ],
  accountNumber: [
    http.post(auth("sign-up/account-number"), () =>
      HttpResponse.json({ accountNumber: "1234567890123456" }),
    ),
  ],
  account: [
    // Names come from the authenticator's AAGUID, not from the user.
    http.get(auth("passkey/list-user-passkeys"), () =>
      HttpResponse.json([
        { id: "pk_1", name: "iCloud Keychain" },
        { id: "pk_2", name: "Chrome on macOS" },
      ]),
    ),
    // `apiKey.list` answers with a paginated envelope, not a bare array.
    http.get(auth("api-key/list"), () =>
      HttpResponse.json({
        apiKeys: [
          { id: "key_1", name: "1", start: "aa_9f2c" },
          { id: "key_2", name: "2", start: "aa_3d81" },
        ],
      }),
    ),
    http.get(auth("list-accounts"), () =>
      HttpResponse.json([
        { id: "acc_1", providerId: "google", accountId: "g_1" },
        { id: "acc_2", providerId: "credential", accountId: "user_fixture" },
      ]),
    ),
    http.get(auth("solana/list"), () => HttpResponse.json([])),
  ],
};
