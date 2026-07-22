import { http, HttpResponse } from "msw";

/**
 * Better Auth talks to `${baseURL}/api/auth/...`, and with no
 * `VITE_CONVEX_SITE_URL` in Storybook that resolves to this origin. Handlers
 * are keyed by the flow a story exercises — no catch-alls.
 */

const auth = (path: string) => `*/api/auth/${path}`;

const session = {
  token: "storybook-session",
  user: {
    id: "user_storybook",
    email: "lucas@example.com",
    name: "Lucas",
    emailVerified: true,
  },
};

const failure = (message: string, status = 401) =>
  HttpResponse.json({ message, code: "STORYBOOK" }, { status });

export const mswHandlers = {
  signInSuccess: [
    http.post(auth("sign-in/email"), () => HttpResponse.json(session)),
    http.post(auth("sign-up/email"), () => HttpResponse.json(session)),
  ],
  signInFailure: [
    http.post(auth("sign-in/email"), () =>
      failure("Invalid email or password"),
    ),
  ],
  magicLink: [
    http.post(auth("sign-in/magic-link"), () =>
      HttpResponse.json({ status: true }),
    ),
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
    http.get(auth("passkey/list-user-passkeys"), () =>
      HttpResponse.json([
        { id: "pk_1", name: "MacBook" },
        { id: "pk_2", name: "iPhone" },
      ]),
    ),
    // `apiKey.list` answers with a paginated envelope, not a bare array.
    http.get(auth("api-key/list"), () =>
      HttpResponse.json({
        apiKeys: [{ id: "key_1", name: "Deploy bot", start: "aa_9f2c" }],
      }),
    ),
  ],
};
