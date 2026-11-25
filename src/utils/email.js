import { Resend } from "resend";
import config from "../config/config.js";

async function sendEmail(recipient, { subject, body }) {
  if (!config.emailApiKey) {
    throw new Error("EMAIL_API_KEY is required to send password reset emails.");
  }

  const resend = new Resend(config.emailApiKey);
  const { data, error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: [recipient],
    subject,
    html: body,
  });

  if (error) throw error;

  return data;
}

export default sendEmail;
