import {
  env,
} from "../../config/env.js";

interface PasswordResetNotificationInput {
  email: string;
  resetToken: string;
  expiresAt: Date;
}

export async function sendPasswordResetNotification(
  input: PasswordResetNotificationInput,
): Promise<void> {
if (env.NODE_ENV === "development") {
  console.info(
    "Password reset notification prepared.",
    {
      recipient: input.email,
      resetToken: input.resetToken,
      expiresAt: input.expiresAt.toISOString(),
    },
  );

  return;
}

  throw new Error(
    "Password reset notification provider is not configured.",
  );
}