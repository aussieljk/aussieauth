/**
 * Outbound email and SMS for the passwordless flows.
 *
 * Both fall back to logging when the provider keys aren't set, so magic links,
 * OTPs and verification emails still work end to end in dev — the code just
 * shows up in the Convex logs instead of an inbox.
 *
 * That fallback is local-only, and deliberately so. A magic link *is* the
 * credential and a reset link is a password change waiting to happen; writing
 * either to the logs is a fine trade when the only reader is the developer who
 * triggered it, and a credential leak when it isn't. Worse, it leaks silently:
 * the endpoint answers 200, the UI says "check your email", and nothing looks
 * wrong until someone notices the mail never arrives.
 *
 * So off a local `SITE_URL`, a missing provider key is an error. A deployment
 * that can't send is a deployment that shouldn't claim it did.
 */

import { env } from "../_generated/server";
import { isLocalSite } from "./site";

const from = () => env.EMAIL_FROM ?? "AussieAuth <onboarding@resend.dev>";

/**
 * Log it and carry on, or refuse — see the note above.
 *
 * `variable` names the env var to set, because the person hitting this is
 * usually one `convex env set` away from a working deployment.
 */
const fallback = (variable: string, channel: string, line: string) => {
  if (!isLocalSite(env.SITE_URL)) {
    throw new Error(
      `${variable} is not set, so this deployment cannot send ${channel}. ` +
        "Set it, or point SITE_URL at localhost if this is a development deployment " +
        "and you want codes written to the logs instead.",
    );
  }
  console.log(line);
};

export const sendEmail = async ({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) => {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    fallback("RESEND_API_KEY", "email", `[email → ${to}] ${subject}\n${text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: from(), to, subject, text }),
  });
  if (!res.ok) {
    throw new Error(`Resend rejected the email: ${res.status} ${await res.text()}`);
  }
};

export const sendSms = async ({ to, body }: { to: string; body: string }) => {
  const username = env.MOBILE_MESSAGE_API_USERNAME;
  const password = env.MOBILE_MESSAGE_API_PASSWORD;
  const sender = env.MOBILE_MESSAGE_SENDER;
  if (!username || !password || !sender) {
    fallback("MOBILE_MESSAGE_API_USERNAME/PASSWORD/SENDER", "SMS", `[sms → ${to}] ${body}`);
    return;
  }
  const res = await fetch("https://api.mobilemessage.com.au/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${username}:${password}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{ to, message: body, sender }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Mobile Message rejected the request: ${res.status} ${await res.text()}`);
  }
  // A 200 only means the batch was accepted — each message carries its own
  // status, so a bad number still needs to surface as a failure here.
  const result = (await res.json()) as {
    results?: { status?: string; error?: string }[];
  };
  const failed = result.results?.find((r) => r.status !== "success");
  if (failed) {
    throw new Error(`Mobile Message could not send to ${to}: ${failed.error ?? failed.status}`);
  }
};
