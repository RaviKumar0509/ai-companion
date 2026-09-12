import type {
  ClientSession,
  Collection,
  ObjectId,
} from "mongodb";

import {
  getCollection,
} from "../../../infrastructure/database/db.js";

import type {
  SessionDocument,
} from "../types/session.types.js";



const SESSIONS_COLLECTION = "auth_sessions";

function getSessionCollection():
  Collection<SessionDocument> {
  return getCollection<SessionDocument>(
    SESSIONS_COLLECTION,
  );
}

export async function createSession(
  session: SessionDocument,
  mongoSession?: ClientSession,
): Promise<SessionDocument> {
  const collection =
    getSessionCollection();

  const result =
    mongoSession !== undefined
      ? await collection.insertOne(
          session,
          {
            session: mongoSession,
          },
        )
      : await collection.insertOne(
          session,
        );

  if (!result.acknowledged) {
    throw new Error(
      "Session creation was not acknowledged by MongoDB.",
    );
  }

  return {
    ...session,
    _id: result.insertedId,
  };
}
export async function findSessionById(
  sessionId: string,
  mongoSession?: ClientSession,
): Promise<SessionDocument | null> {
  const collection =
    getSessionCollection();

  return mongoSession !== undefined
    ? collection.findOne(
        {
          sessionId,
        },
        {
          session: mongoSession,
        },
      )
    : collection.findOne({
        sessionId,
      });
}

export async function findSessionByTokenFamilyId(
  tokenFamilyId: string,
): Promise<SessionDocument | null> {
  return getSessionCollection().findOne({
    tokenFamilyId,
  });
}

export async function updateSession(
  sessionId: string,
  update: Partial<SessionDocument>,
): Promise<boolean> {
  const result =
    await getSessionCollection().updateOne(
      {
        sessionId,
      },
      {
        $set: update,
      },
    );

  return result.modifiedCount === 1;
}

export async function revokeSession(
  sessionId: string,
  reason: string,
  mongoSession?: ClientSession,
): Promise<boolean> {
  const collection =
    getSessionCollection();

  const revokedAt =
    new Date();

  const filter = {
    sessionId,
    status: "active" as const,
  };

  const update = {
    $set: {
      status: "revoked" as const,
      revokedAt,
      revokedReason: reason,
    },
  };

  const result =
    mongoSession !== undefined
      ? await collection.updateOne(
          filter,
          update,
          {
            session: mongoSession,
          },
        )
      : await collection.updateOne(
          filter,
          update,
        );

  return result.modifiedCount === 1;
}

export async function revokeAllUserSessions(
  userId: ObjectId,
  reason: string,
  mongoSession?: ClientSession,
): Promise<void> {
  const collection =
    getSessionCollection();

  const revokedAt =
    new Date();

  const filter = {
    userId,
    status: "active" as const,
  };

  const update = {
    $set: {
      status: "revoked" as const,
      revokedAt,
      revokedReason: reason,
    },
  };

  if (mongoSession !== undefined) {
    await collection.updateMany(
      filter,
      update,
      {
        session: mongoSession,
      },
    );

    return;
  }

  await collection.updateMany(
    filter,
    update,
  );
}

export async function rotateSessionRefreshToken(
  input: {
    sessionId: string;
    currentRefreshTokenHash: string;
    newRefreshTokenHash: string;
    lastUsedAt: Date;
  },
  mongoSession?: ClientSession,
): Promise<SessionDocument | null> {
  const collection =
    getSessionCollection();

  const filter = {
    sessionId:
      input.sessionId,

    status: "active" as const,

    refreshTokenHash:
      input.currentRefreshTokenHash,

    expiresAt: {
      $gt: input.lastUsedAt,
    },
  };

  const update = {
    $set: {
      refreshTokenHash:
        input.newRefreshTokenHash,

      lastUsedAt:
        input.lastUsedAt,
    },

    $inc: {
      refreshTokenVersion: 1,
    },
  };

  return mongoSession !== undefined
    ? collection.findOneAndUpdate(
        filter,
        update,
        {
          returnDocument: "after",
          session: mongoSession,
        },
      )
    : collection.findOneAndUpdate(
        filter,
        update,
        {
          returnDocument: "after",
        },
      );
}