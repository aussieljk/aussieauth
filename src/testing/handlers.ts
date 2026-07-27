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
  signInFailure: [http.post(auth("sign-in/email"), () => failure("Invalid email or password"))],
  magicLink: [http.post(auth("sign-in/magic-link"), () => HttpResponse.json({ status: true }))],
  emailOtp: [
    http.post(auth("email-otp/send-verification-otp"), () => HttpResponse.json({ success: true })),
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
    // The sessions card cross-references the list against the current session's
    // token to find "this device". `get-session` answers with the session and
    // user side by side — not the flat shape the sign-in mocks use.
    http.get(auth("get-session"), () =>
      HttpResponse.json({ session: { token: session.token }, user: session.user }),
    ),
    http.get(auth("list-sessions"), () =>
      HttpResponse.json([
        {
          token: "fixture-session",
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
          createdAt: "2026-07-01T00:00:00.000Z",
        },
        {
          token: "other-session",
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          createdAt: "2026-07-20T00:00:00.000Z",
        },
      ]),
    ),
  ],
  /** The sign-in card's mount-time probe finds the stored session still good. */
  sessionAlive: [http.get(auth("get-session"), () => HttpResponse.json(session))],
  /** The server answers, and the answer is that the session is gone. */
  sessionRevoked: [http.get(auth("get-session"), () => failure("Session expired"))],
};
