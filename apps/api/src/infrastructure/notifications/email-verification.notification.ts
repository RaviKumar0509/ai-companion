import { env } from "../../config/env.js";
import { sendMail } from "./mail/mail.client.js";

interface EmailVerificationNotificationInput {
  email: string;
  verificationToken: string;
  expiresAt: Date;
}

export async function sendEmailVerificationNotification(
  input: EmailVerificationNotificationInput,
): Promise<void> {
  const verificationUrl =
    `${env.WEB_APP_URL}/verify-email?token=${encodeURIComponent(
      input.verificationToken,
    )}`;

  await sendMail({
    to: input.email,
    subject: "Verify your AI Companion email address",
    text: [
      "Please verify your email address for your AI Companion account.",
      "",
      `Verify your email: ${verificationUrl}`,
      "",
      `This link expires at ${input.expiresAt.toISOString()}.`,
      "",
      "If you did not create this account, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <p>
        Please verify your email address for your AI Companion account.
      </p>

      <p>
        <a href="${verificationUrl}">
          Verify your email address
        </a>
      </p>

      <p>
        This link expires at
        <strong>${input.expiresAt.toISOString()}</strong>.
      </p>

      <p>
        If you did not create this account, you can safely ignore this email.
      </p>
    `,
  });
}