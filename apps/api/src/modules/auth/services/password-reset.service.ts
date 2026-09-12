import {
  mongoClient,
} from "../../../infrastructure/database/client.js";

import {
  findUserByEmail,
  updateUserPassword,
} from "../repositories/user.repository.js";

import {
  sendPasswordResetNotification,
} from "../../../infrastructure/notifications/index.js";

import {
  createPasswordResetToken,
  findPasswordResetTokenByHash,
  markPasswordResetTokenUsed,
  revokeActivePasswordResetTokensForUser,
} from "../repositories/password-reset-token.repository.js";

import {
  revokeAllUserSessions,
} from "../repositories/session.repository.js";

import {
  generatePasswordResetToken,
  hashPasswordResetToken,
} from "./token.service.js";

import {
  hashPassword,
} from "./password.service.js";

import {
  AUTH_CONSTANTS,
} from "../constants/auth.constants.js";

import {
  InvalidCredentialsError,
} from "../../../shared/errors/index.js";

export async function requestPasswordReset(
  email: string,
): Promise<void> {
  const normalizedEmail =
    email.trim().toLowerCase();

  const user =
    await findUserByEmail(
      normalizedEmail,
    );

  if (!user) {
    return;
  }

  const now = new Date();

  const expiresAt =
    new Date(
      now.getTime() +
        AUTH_CONSTANTS.PASSWORD_RESET
          .EXPIRES_IN_MINUTES *
          60 *
          1000,
    );

  const resetToken =
    generatePasswordResetToken();

  const tokenHash =
    hashPasswordResetToken(
      resetToken,
    );

  const mongoSession =
    mongoClient.startSession();

  try {
    await mongoSession.withTransaction(
      async () => {
        await revokeActivePasswordResetTokensForUser(
          user._id!,
          now,
          mongoSession,
        );

        await createPasswordResetToken(
          {
            tokenHash,
            userId: user._id!,
            status: "active",
            issuedAt: now,
            expiresAt,
          },
          mongoSession,
        );
      },
    );

  await sendPasswordResetNotification({
    email: normalizedEmail,
    resetToken,
    expiresAt,
  });
  } finally {
    await mongoSession.endSession();
  }
}

export async function resetPassword(
  resetToken: string,
  newPassword: string,
): Promise<void> {
  const tokenHash =
    hashPasswordResetToken(
      resetToken,
    );

  const mongoSession =
    mongoClient.startSession();

  try {
    await mongoSession.withTransaction(
      async () => {
        const passwordResetToken =
          await findPasswordResetTokenByHash(
            tokenHash,
            mongoSession,
          );

        if (
          !passwordResetToken ||
          passwordResetToken.status !== "active"
        ) {
throw new InvalidCredentialsError();
        }

        const now = new Date();

        if (
          passwordResetToken.expiresAt.getTime() <=
          now.getTime()
        ) {
           throw new InvalidCredentialsError();
        }

        const passwordHash =
          await hashPassword(
            newPassword,
          );

        const passwordUpdated =
          await updateUserPassword(
            passwordResetToken.userId,
            passwordHash,
            now,
            mongoSession,
          );

        if (!passwordUpdated) {
         throw new InvalidCredentialsError();
        }

        const tokenMarkedUsed =
          await markPasswordResetTokenUsed(
            tokenHash,
            now,
            mongoSession,
          );

        if (!tokenMarkedUsed) {
         throw new InvalidCredentialsError();
        }

        await revokeAllUserSessions(
          passwordResetToken.userId,
          "password_reset",
          mongoSession,
        );

        await revokeActivePasswordResetTokensForUser(
          passwordResetToken.userId,
          now,
          mongoSession,
        );
      },
    );
  } finally {
    await mongoSession.endSession();
  }
}