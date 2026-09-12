import { ObjectId } from "mongodb";

import { mongoClient } from "../../../infrastructure/database/client.js";

import {
  InvalidCredentialsError,
} from "../../../shared/errors/index.js";

import {
  sendEmailVerificationNotification,
} from "../../../infrastructure/notifications/index.js";

import {
  findUserById,
  updateUserEmailVerified,
} from "../repositories/user.repository.js";

import {
  createEmailVerificationToken,
  findEmailVerificationTokenByHash,
  markEmailVerificationTokenUsed,
  revokeActiveEmailVerificationTokensForUser,
} from "../repositories/email-verification-token.repository.js";

import {
  generateEmailVerificationToken,
  hashEmailVerificationToken,
} from "./token.service.js";

import {
  AUTH_CONSTANTS,
} from "../constants/auth.constants.js";

export async function issueEmailVerificationToken(
  userId: string,
): Promise<string> {
  const user = await findUserById(
    new ObjectId(userId),
  );

  if (!user) {
    throw new InvalidCredentialsError();
  }

  if (user.emailVerified) {
    throw new InvalidCredentialsError();
  }

  const now = new Date();

  const expiresAt = new Date(
    now.getTime() +
      AUTH_CONSTANTS.EMAIL_VERIFICATION
        .EXPIRES_IN_MINUTES *
        60 *
        1000,
  );

  const verificationToken =
    generateEmailVerificationToken();

  const tokenHash =
    hashEmailVerificationToken(
      verificationToken,
    );

  const mongoSession =
    mongoClient.startSession();

  try {
    await mongoSession.withTransaction(
      async () => {
        await revokeActiveEmailVerificationTokensForUser(
          user._id!,
          now,
          mongoSession,
        );

        await createEmailVerificationToken(
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

    console.info(
      "STEP: sending email verification notification",
      {
        userId,
        email: user.email,
      },
    );

    await sendEmailVerificationNotification({
      email: user.email,
      verificationToken,
      expiresAt,
    });

    return verificationToken;
  } finally {
    await mongoSession.endSession();
  }
}

export async function verifyEmail(
  verificationToken: string,
): Promise<void> {
  const tokenHash =
    hashEmailVerificationToken(
      verificationToken,
    );

  const mongoSession =
    mongoClient.startSession();

  try {
    await mongoSession.withTransaction(
      async () => {
        const token =
          await findEmailVerificationTokenByHash(
            tokenHash,
            mongoSession,
          );

        if (
          !token ||
          token.status !== "active"
        ) {
          throw new InvalidCredentialsError();
        }

        const now = new Date();

        if (
          token.expiresAt.getTime() <=
          now.getTime()
        ) {
          throw new InvalidCredentialsError();
        }

        const user =
          await findUserById(
            token.userId,
            mongoSession,
          );

        if (!user) {
          throw new InvalidCredentialsError();
        }

        if (user.emailVerified) {
          throw new InvalidCredentialsError();
        }

        const updated =
          await updateUserEmailVerified(
            token.userId,
            now,
            mongoSession,
          );

        if (!updated) {
          throw new InvalidCredentialsError();
        }

        const tokenMarkedUsed =
          await markEmailVerificationTokenUsed(
            tokenHash,
            now,
            mongoSession,
          );

        if (!tokenMarkedUsed) {
          throw new InvalidCredentialsError();
        }

        await revokeActiveEmailVerificationTokensForUser(
          token.userId,
          now,
          mongoSession,
        );
      },
    );
  } finally {
    await mongoSession.endSession();
  }
}