import { randomUUID } from "node:crypto";

import {
  mongoClient,
} from "../../../infrastructure/database/client.js";

import {
  createRefreshToken,
  revokeRefreshTokenFamily,
} from "../repositories/refresh-token.repository.js";

import {
  createSession,
  findSessionById,
  revokeSession,
} from "../repositories/session.repository.js";

import {
  generateRefreshToken,
  hashRefreshToken,
} from "./token.service.js";

import {
  AUTH_CONSTANTS,
} from "../constants/auth.constants.js";

import {
  REFRESH_TOKEN_STATUS,
} from "../types/refresh-token.types.js";

import {
  SESSION_STATUS,
  type SessionDocument,
} from "../types/session.types.js";

import type {
  ObjectId,
} from "mongodb";

export interface CreateSessionInput {
  userId: ObjectId;

  deviceId?: string;
  deviceName?: string;

  platform?: "web" | "android" | "ios";

  userAgent?: string;
  ipAddress?: string;
}

export interface CreatedSession {
  session: SessionDocument;

  /**
   * Raw refresh token.
   *
   * This value is returned to the authentication
   * layer but is never persisted.
   */
  refreshToken: string;
}

export async function createUserSession(
  input: CreateSessionInput,
): Promise<CreatedSession> {
  const now = new Date();

  const sessionId =
    randomUUID();

  const tokenFamilyId =
    randomUUID();

  const refreshToken =
    generateRefreshToken();

  const refreshTokenHash =
    hashRefreshToken(
      refreshToken,
    );

  const expiresAt =
    new Date(now);

  expiresAt.setDate(
    expiresAt.getDate() +
      AUTH_CONSTANTS.JWT
        .REFRESH_TOKEN_EXPIRES_IN_DAYS,
  );

  const session: SessionDocument = {
    userId: input.userId,

    status:
      SESSION_STATUS.ACTIVE,

    sessionId,

    refreshTokenHash,

    tokenFamilyId,

    refreshTokenVersion: 1,

    ...(input.deviceId !== undefined && {
      deviceId: input.deviceId,
    }),

    ...(input.deviceName !== undefined && {
      deviceName: input.deviceName,
    }),

    ...(input.platform !== undefined && {
      platform: input.platform,
    }),

    ...(input.userAgent !== undefined && {
      userAgent: input.userAgent,
    }),

    ...(input.ipAddress !== undefined && {
      ipAddress: input.ipAddress,
    }),

    createdAt: now,

    lastUsedAt: now,

    expiresAt,
  };

  const refreshTokenDocument = {
    tokenHash: refreshTokenHash,

    sessionId,

    tokenFamilyId,

    version: 1,

    status:
      REFRESH_TOKEN_STATUS.ACTIVE,

    issuedAt: now,

    expiresAt,
  };

  const mongoSession =
    mongoClient.startSession();

  try {
    let createdSession:
      SessionDocument;

    await mongoSession.withTransaction(
      async () => {
        createdSession =
          await createSession(
            session,
            mongoSession,
          );

        await createRefreshToken(
          refreshTokenDocument,
          mongoSession,
        );
      },
    );

    return {
      session:
        createdSession!,
      refreshToken,
    };
  } finally {
    await mongoSession.endSession();
  }
}

/**
 * Revokes the currently authenticated
 * session and its refresh-token family.
 *
 * Both operations are performed inside the
 * same MongoDB transaction so authentication
 * state remains consistent if an operation fails.
 */
/**
 * Revokes the currently authenticated
 * session and its refresh-token family.
 *
 * Both operations are performed inside the
 * same MongoDB transaction so authentication
 * state remains consistent if an operation fails.
 */
export async function logoutUser(
  sessionId: string,
): Promise<void> {
  const mongoSession =
    mongoClient.startSession();

  try {
    await mongoSession.withTransaction(
      async () => {
        const session =
          await findSessionById(
            sessionId,
            mongoSession,
          );

        if (!session) {
          return;
        }

        const revokedAt =
          new Date();

        await revokeSession(
          sessionId,
          "user_logout",
          mongoSession,
        );

        await revokeRefreshTokenFamily(
          session.tokenFamilyId,
          revokedAt,
          mongoSession,
        );
      },
    );
  } finally {
    await mongoSession.endSession();
  }
}

async function findSessionForLogout(
  sessionId: string,
  mongoSession: import("mongodb").ClientSession,
): Promise<SessionDocument | null> {
  return (
    await import(
      "../repositories/session.repository.js"
    )
  ).findSessionById(
    sessionId,
    mongoSession,
  );
}