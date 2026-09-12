import type {
  ClientSession,
  Collection,
  InsertOneResult,
  ObjectId,
} from "mongodb";

import {
  getCollection,
} from "../../../infrastructure/database/db.js";

import type {
  PasswordResetTokenDocument,
} from "../types/password-reset-token.types.js";

import {
  PASSWORD_RESET_TOKEN_STATUS,
} from "../types/password-reset-token.types.js";

const PASSWORD_RESET_TOKENS_COLLECTION =
  "passwordResetTokens";

function getPasswordResetTokenCollection():
  Collection<PasswordResetTokenDocument> {
  return getCollection<PasswordResetTokenDocument>(
    PASSWORD_RESET_TOKENS_COLLECTION,
  );
}

function getSessionOptions(
  mongoSession?: ClientSession,
): { session: ClientSession } | Record<string, never> {
  if (!mongoSession) {
    return {};
  }

  return {
    session: mongoSession,
  };
}

export async function createPasswordResetToken(
  token: PasswordResetTokenDocument,
  mongoSession?: ClientSession,
): Promise<PasswordResetTokenDocument> {
  const result: InsertOneResult<PasswordResetTokenDocument> =
    await getPasswordResetTokenCollection().insertOne(
      token,
      getSessionOptions(mongoSession),
    );

  if (!result.acknowledged) {
    throw new Error(
      "Password reset token creation was not acknowledged by MongoDB.",
    );
  }

  return token;
}

export async function findPasswordResetTokenByHash(
  tokenHash: string,
  mongoSession?: ClientSession,
): Promise<PasswordResetTokenDocument | null> {
  return getPasswordResetTokenCollection().findOne(
    {
      tokenHash,
    },
    getSessionOptions(mongoSession),
  );
}

export async function markPasswordResetTokenUsed(
  tokenHash: string,
  usedAt: Date,
  mongoSession?: ClientSession,
): Promise<boolean> {
  const result =
    await getPasswordResetTokenCollection().updateOne(
      {
        tokenHash,
        status:
          PASSWORD_RESET_TOKEN_STATUS.ACTIVE,
      },
      {
        $set: {
          status:
            PASSWORD_RESET_TOKEN_STATUS.USED,
          usedAt,
        },
      },
      getSessionOptions(mongoSession),
    );

  return result.modifiedCount === 1;
}

export async function revokeActivePasswordResetTokensForUser(
  userId: ObjectId,
  revokedAt: Date,
  mongoSession?: ClientSession,
): Promise<void> {
  await getPasswordResetTokenCollection().updateMany(
    {
      userId,
      status:
        PASSWORD_RESET_TOKEN_STATUS.ACTIVE,
    },
    {
      $set: {
        status:
          PASSWORD_RESET_TOKEN_STATUS.REVOKED,
        revokedAt,
      },
    },
    getSessionOptions(mongoSession),
  );
}