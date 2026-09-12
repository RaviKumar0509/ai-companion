import {
  env,
} from "../../config/env.js";

interface EmailVerificationNotificationInput {
  email: string;
  verificationToken: string;
  expiresAt: Date;
}

export async function sendEmailVerificationNotification(
  input: EmailVerificationNotificationInput,
): Promise<void> {
  if (env.NODE_ENV === "development") {
    const verificationUrl =
      `${env.WEB_APP_URL}/verify-email?token=${encodeURIComponent(
        input.verificationToken,
      )}`;

    console.info(
      "Email verification notification prepared.",
      {
        recipient: input.email,
        verificationUrl,
        expiresAt: input.expiresAt.toISOString(),
      },
    );

    return;
  }

  throw new Error(
    "Email verification notification provider is not configured.",
  );
}