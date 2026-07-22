import { query } from "./_generated/server";

/**
 * Which methods have their credentials set on this deployment. The sign-in UI
 * badges the rest as "needs setup" instead of letting them fail on click.
 */
export const setup = query({
  args: {},
  handler: async () => ({
    google: Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    ),
    github: Boolean(
      process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
    ),
    apple: Boolean(
      process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY,
    ),
    // Without these, codes and links are written to the Convex logs instead.
    email: Boolean(process.env.RESEND_API_KEY),
    sms: Boolean(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
    ),
  }),
});
