import type {
  ClientSession,
  Collection,
} from "mongodb";

import {
  getCollection,
} from "../../../infrastructure/database/db.js";

import type {
  RefreshTokenDocument,
} from "../types/refresh-token.types.js";

const REFRESH_TOKENS_COLLECTION =
  "auth_refresh_tokens";

function getRefreshTokenCollection():
  Collection<RefreshTokenDocument> {
  return getCollection<RefreshTokenDocument>(
    REFRESH_TOKENS_COLLECTION,
  );
}

export async function createRefreshToken(
  token: RefreshTokenDocument,
  mongoSession?: ClientSession,
): Promise<RefreshTokenDocument> {
  const collection =
    getRefreshTokenCollection();

  const result =
    mongoSession !== undefined
      ? await collection.insertOne(
          token,
          {
            session: mongoSession,
          },
        )
      : await collection.insertOne(
          token,
        );

  if (!result.acknowledged) {
    throw new Error(
      "Refresh token creation was not acknowledged by MongoDB.",
    );
  }

  return {
    ...token,
    _id: result.insertedId,
  };
}

export async function findRefreshTokenByHash(
  tokenHash: string,
  mongoSession?: ClientSession,
): Promise<RefreshTokenDocument | null> {
  const collection =
    getRefreshTokenCollection();

  return mongoSession !== undefined
    ? collection.findOne(
        {
          tokenHash,
        },
        {
          session: mongoSession,
        },
      )
    : collection.findOne({
        tokenHash,
      });
}

export async function markRefreshTokenUsed(
  tokenHash: string,
  usedAt: Date,
  mongoSession?: ClientSession,
): Promise<boolean> {
  const collection =
    getRefreshTokenCollection();

  const result =
    mongoSession !== undefined
      ? await collection.updateOne(
          {
            tokenHash,
            status: "active",
          },
          {
            $set: {
              status: "used",
              usedAt,
            },
          },
          {
            session: mongoSession,
          },
        )
      : await collection.updateOne(
          {
            tokenHash,
            status: "active",
          },
          {
            $set: {
              status: "used",
              usedAt,
            },
          },
        );

  return result.modifiedCount === 1;
}

export async function revokeRefreshTokenFamily(
  tokenFamilyId: string,
  revokedAt: Date,
  mongoSession?: ClientSession,
): Promise<number> {
  const collection =
    getRefreshTokenCollection();

  const result =
    mongoSession !== undefined
      ? await collection.updateMany(
          {
            tokenFamilyId,
            status: {
              $ne: "revoked",
            },
          },
          {
            $set: {
              status: "revoked",
              revokedAt,
            },
          },
          {
            session: mongoSession,
          },
        )
      : await collection.updateMany(
          {
            tokenFamilyId,
            status: {
              $ne: "revoked",
            },
          },
          {
            $set: {
              status: "revoked",
              revokedAt,
            },
          },
        );

  return result.modifiedCount;
}