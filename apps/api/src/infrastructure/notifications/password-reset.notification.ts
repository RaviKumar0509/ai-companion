import { env } from "../../config/env.js";
import { sendMail } from "./mail/mail.client.js";

interface PasswordResetNotificationInput {
  email: string;
  resetToken: string;
  expiresAt: Date;
}

export async function sendPasswordResetNotification(
  input: PasswordResetNotificationInput,
): Promise<void> {
  const resetUrl =
    `${env.WEB_APP_URL}/reset-password?token=${encodeURIComponent(
      input.resetToken,
    )}`;

  await sendMail({
    to: input.email,
    subject: "Reset your AI Companion password",
    text: [
      "We received a request to reset your AI Companion password.",
      "",
      `Reset your password using this link: ${resetUrl}`,
      "",
      `This link expires at ${input.expiresAt.toISOString()}.`,
      "",
      "If you did not request this, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <p>We received a request to reset your AI Companion password.</p>

      <p>
        <a href="${resetUrl}">
          Reset your password
        </a>
      </p>

      <p>
        This link expires at
        <strong>${input.expiresAt.toISOString()}</strong>.
      </p>

      <p>
        If you did not request this, you can safely ignore this email.
      </p>
    `,
  });
}