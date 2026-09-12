import type {
  ClientSession,
  Collection,
  InsertOneResult,
  ObjectId,
} from "mongodb";

import {
  getCollection,
} from "../../../infrastructure/database/db.js";

import {
  EMAIL_VERIFICATION_TOKEN_STATUS,
  type EmailVerificationTokenDocument,
} from "../types/email-verification-token.types.js";

const EMAIL_VERIFICATION_TOKENS_COLLECTION =
  "emailVerificationTokens";

function getEmailVerificationTokenCollection():
  Collection<EmailVerificationTokenDocument> {
  return getCollection<EmailVerificationTokenDocument>(
    EMAIL_VERIFICATION_TOKENS_COLLECTION,
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

export async function createEmailVerificationToken(
  token: EmailVerificationTokenDocument,
  mongoSession?: ClientSession,
): Promise<EmailVerificationTokenDocument> {
  const result: InsertOneResult<EmailVerificationTokenDocument> =
    await getEmailVerificationTokenCollection().insertOne(
      token,
      getSessionOptions(mongoSession),
    );

  if (!result.acknowledged) {
    throw new Error(
      "Email verification token creation was not acknowledged by MongoDB.",
    );
  }

  return {
    ...token,
    _id: result.insertedId,
  };
}

export async function findEmailVerificationTokenByHash(
  tokenHash: string,
  mongoSession?: ClientSession,
): Promise<EmailVerificationTokenDocument | null> {
  return getEmailVerificationTokenCollection().findOne(
    {
      tokenHash,
    },
    getSessionOptions(mongoSession),
  );
}

export async function markEmailVerificationTokenUsed(
  tokenHash: string,
  usedAt: Date,
  mongoSession?: ClientSession,
): Promise<boolean> {
  const result =
    await getEmailVerificationTokenCollection().updateOne(
      {
        tokenHash,
        status: EMAIL_VERIFICATION_TOKEN_STATUS.ACTIVE,
      },
      {
        $set: {
          status: EMAIL_VERIFICATION_TOKEN_STATUS.USED,
          usedAt,
        },
      },
      getSessionOptions(mongoSession),
    );

  return result.modifiedCount === 1;
}

export async function revokeActiveEmailVerificationTokensForUser(
  userId: ObjectId,
  revokedAt: Date,
  mongoSession?: ClientSession,
): Promise<void> {
  await getEmailVerificationTokenCollection().updateMany(
    {
      userId,
      status: EMAIL_VERIFICATION_TOKEN_STATUS.ACTIVE,
    },
    {
      $set: {
        status: EMAIL_VERIFICATION_TOKEN_STATUS.REVOKED,
        revokedAt,
      },
    },
    getSessionOptions(mongoSession),
  );
}