/**
 * Outbound email and SMS for the passwordless flows.
 *
 * Both fall back to logging when the provider keys aren't set, so magic links,
 * OTPs and verification emails still work end to end in dev — the code just
 * shows up in the Convex logs instead of an inbox.
 */

const from = () =>
  process.env.EMAIL_FROM ?? "AussieAuth <onboarding@resend.dev>";

export const sendEmail = async ({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email → ${to}] ${subject}\n${text}`);
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
    throw new Error(
      `Resend rejected the email: ${res.status} ${await res.text()}`,
    );
  }
};

export const sendSms = async ({ to, body }: { to: string; body: string }) => {
  const username = process.env.MOBILE_MESSAGE_API_USERNAME;
  const password = process.env.MOBILE_MESSAGE_API_PASSWORD;
  const sender = process.env.MOBILE_MESSAGE_SENDER;
  if (!username || !password || !sender) {
    console.log(`[sms → ${to}] ${body}`);
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
    throw new Error(
      `Mobile Message rejected the request: ${res.status} ${await res.text()}`,
    );
  }
  // A 200 only means the batch was accepted — each message carries its own
  // status, so a bad number still needs to surface as a failure here.
  const result = (await res.json()) as {
    results?: { status?: string; error?: string }[];
  };
  const failed = result.results?.find((r) => r.status !== "success");
  if (failed) {
    throw new Error(
      `Mobile Message could not send to ${to}: ${failed.error ?? failed.status}`,
    );
  }
};
