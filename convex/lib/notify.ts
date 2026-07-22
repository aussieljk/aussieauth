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
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const sender = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !sender) {
    console.log(`[sms → ${to}] ${body}`);
    return;
  }
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: sender, Body: body }),
    },
  );
  if (!res.ok) {
    throw new Error(
      `Twilio rejected the message: ${res.status} ${await res.text()}`,
    );
  }
};
