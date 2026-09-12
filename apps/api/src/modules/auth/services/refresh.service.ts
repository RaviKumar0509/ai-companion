import {
  mongoClient,
} from "../../../infrastructure/database/client.js";

import {
  UnauthorizedError,
} from "../../../shared/errors/index.js";

import {
  findRefreshTokenByHash,
  markRefreshTokenUsed,
  createRefreshToken,
  revokeRefreshTokenFamily,
} from "../repositories/refresh-token.repository.js";

import {
  findSessionById,
  rotateSessionRefreshToken,
  revokeSession,
} from "../repositories/session.repository.js";

import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "./token.service.js";

import {
  REFRESH_TOKEN_STATUS,
} from "../types/refresh-token.types.js";

import {
  SESSION_STATUS,
} from "../types/session.types.js";

import type {
  AuthenticationResult,
} from "../types/auth.types.js";

export async function refreshAuthentication(
  refreshToken: string,
): Promise<AuthenticationResult["tokens"]> {
  if (!refreshToken) {
    throw new UnauthorizedError(
      "Invalid refresh token.",
    );
  }

  const currentRefreshTokenHash =
    hashRefreshToken(
      refreshToken,
    );

  const mongoSession =
    mongoClient.startSession();

  try {
    let authenticationTokens:
      AuthenticationResult["tokens"];

    await mongoSession.withTransaction(
      async () => {
        const tokenDocument =
          await findRefreshTokenByHash(
            currentRefreshTokenHash,
            mongoSession,
          );

        /*
         * Token does not exist.
         */
        if (!tokenDocument) {
          throw new UnauthorizedError(
            "Invalid refresh token.",
          );
        }

        /*
         * A REVOKED token was intentionally
         * invalidated, for example during logout.
         *
         * This is not the same as refresh-token
         * reuse and must not be reported as a
         * security reuse event.
         */
        if (
          tokenDocument.status ===
          REFRESH_TOKEN_STATUS.REVOKED
        ) {
          throw new UnauthorizedError(
            "Authentication session is no longer active.",
          );
        }

        /*
         * A USED token was previously rotated.
         *
         * Presenting it again indicates possible
         * refresh-token reuse and is treated as
         * a security event.
         */
        if (
          tokenDocument.status ===
          REFRESH_TOKEN_STATUS.USED
        ) {
          const reuseDetectedAt =
            new Date();

          await revokeRefreshTokenFamily(
            tokenDocument.tokenFamilyId,
            reuseDetectedAt,
            mongoSession,
          );

          await revokeSession(
            tokenDocument.sessionId,
            "refresh_token_reuse",
            mongoSession,
          );

          throw new UnauthorizedError(
            "Refresh token reuse detected.",
          );
        }

        const now =
          new Date();

        /*
         * Verify token expiration.
         *
         * TTL deletion is not relied upon for
         * authentication decisions.
         */
        if (
          tokenDocument.expiresAt <=
          now
        ) {
          await revokeRefreshTokenFamily(
            tokenDocument.tokenFamilyId,
            now,
            mongoSession,
          );

          await revokeSession(
            tokenDocument.sessionId,
            "refresh_token_expired",
            mongoSession,
          );

          throw new UnauthorizedError(
            "Refresh token has expired.",
          );
        }

        /*
         * Find the associated authentication session.
         */
        const session =
          await findSessionById(
            tokenDocument.sessionId,
            mongoSession,
          );

        if (!session) {
          throw new UnauthorizedError(
            "Authentication session is invalid.",
          );
        }

        if (
          session.status !==
          SESSION_STATUS.ACTIVE
        ) {
          throw new UnauthorizedError(
            "Authentication session is no longer active.",
          );
        }

        if (
          session.expiresAt <=
          now
        ) {
          await revokeSession(
            session.sessionId,
            "authentication_session_expired",
            mongoSession,
          );

          await revokeRefreshTokenFamily(
            session.tokenFamilyId,
            now,
            mongoSession,
          );

          throw new UnauthorizedError(
            "Authentication session has expired.",
          );
        }

        /*
         * Generate the replacement refresh token.
         */
        const newRefreshToken =
          generateRefreshToken();

        const newRefreshTokenHash =
          hashRefreshToken(
            newRefreshToken,
          );

        const newVersion =
          session.refreshTokenVersion +
          1;

        /*
         * Atomically replace the current
         * refresh-token hash.
         *
         * If another request already rotated
         * this token, this operation returns null.
         */
        const rotatedSession =
          await rotateSessionRefreshToken(
            {
              sessionId:
                session.sessionId,

              currentRefreshTokenHash,

              newRefreshTokenHash,

              lastUsedAt: now,
            },
            mongoSession,
          );

        if (!rotatedSession) {
          throw new UnauthorizedError(
            "Refresh token is no longer valid.",
          );
        }

        /*
         * Mark the old token as USED.
         */
        const markedUsed =
          await markRefreshTokenUsed(
            currentRefreshTokenHash,
            now,
            mongoSession,
          );

        if (!markedUsed) {
          throw new UnauthorizedError(
            "Refresh token is no longer valid.",
          );
        }

        /*
         * Store the new refresh-token history entry.
         */
        await createRefreshToken(
          {
            tokenHash:
              newRefreshTokenHash,

            sessionId:
              session.sessionId,

            tokenFamilyId:
              session.tokenFamilyId,

            version:
              newVersion,

            status:
              REFRESH_TOKEN_STATUS.ACTIVE,

            issuedAt: now,

            expiresAt:
              session.expiresAt,
          },
          mongoSession,
        );

        /*
         * Generate a fresh short-lived access token.
         */
        const accessToken =
          await generateAccessToken(
            session.userId.toString(),
            session.sessionId,
          );

        authenticationTokens = {
          accessToken,

          refreshToken:
            newRefreshToken,

          expiresIn:
            15 * 60,
        };
      },
    );

    return authenticationTokens!;
  } finally {
    await mongoSession.endSession();
  }
}