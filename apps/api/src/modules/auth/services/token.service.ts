import {
  createHash,
  randomBytes,
} from "node:crypto";

import {
  SignJWT,
  jwtVerify,
  type JWTPayload,
} from "jose";

import { env } from "../../../config/env.js";

import {
  AUTH_CONSTANTS,
} from "../constants/auth.constants.js";

function getAccessTokenSecret(): Uint8Array {
  return new TextEncoder().encode(
    env.JWT_ACCESS_SECRET,
  );
}

/**
 * Creates a short-lived JWT access token.
 *
 * The access token contains only the minimum
 * identity information required by downstream
 * authentication middleware.
 */
export async function generateAccessToken(
  userId: string,
  sessionId: string,
): Promise<string> {
  const secret =
    getAccessTokenSecret();

  return new SignJWT({
    sid: sessionId,
  })
    .setProtectedHeader({
      alg: AUTH_CONSTANTS.JWT.ALGORITHM,
      typ: "JWT",
    })
    .setSubject(userId)
    .setIssuer(
      AUTH_CONSTANTS.JWT.ISSUER,
    )
    .setAudience(
      AUTH_CONSTANTS.JWT.AUDIENCE,
    )
    .setIssuedAt()
    .setExpirationTime(
      AUTH_CONSTANTS.JWT.ACCESS_TOKEN_EXPIRES_IN,
    )
    .sign(secret);
}

/**
 * Generates a cryptographically secure opaque
 * refresh token.
 *
 * The raw value is returned only to the caller.
 * We never persist this raw value in MongoDB.
 */
export function generateRefreshToken(): string {
  return randomBytes(
    AUTH_CONSTANTS.REFRESH_TOKEN_BYTES,
  ).toString("base64url");
}

/**
 * Creates the server-side representation of
 * a refresh token.
 *
 * SHA-256 is sufficient here because the token
 * itself has high cryptographic entropy and is
 * generated randomly.
 */
export function hashRefreshToken(
  refreshToken: string,
): string {
  return createHash("sha256")
    .update(refreshToken, "utf8")
    .digest("hex");
}


export function generatePasswordResetToken(): string {
  return randomBytes(
    AUTH_CONSTANTS.PASSWORD_RESET.TOKEN_BYTES,
  ).toString("base64url");
}

export function hashPasswordResetToken(
  resetToken: string,
): string {
  return createHash("sha256")
    .update(resetToken, "utf8")
    .digest("hex");
}

/**
 * Verifies an access token and returns its JWT
 * payload.
 *
 * Issuer and audience are verified explicitly so
 * tokens created for another service cannot be
 * accepted accidentally.
 */
export function generateEmailVerificationToken(): string {
  return randomBytes(
    AUTH_CONSTANTS.EMAIL_VERIFICATION.TOKEN_BYTES,
  ).toString("base64url");
}

export function hashEmailVerificationToken(
  verificationToken: string,
): string {
  return createHash("sha256")
    .update(verificationToken, "utf8")
    .digest("hex");
}



export async function verifyAccessToken(
  accessToken: string,
): Promise<JWTPayload> {
  const secret =
    getAccessTokenSecret();

  const { payload } =
    await jwtVerify(
      accessToken,
      secret,
      {
        algorithms: [
          AUTH_CONSTANTS.JWT.ALGORITHM,
        ],
        issuer:
          AUTH_CONSTANTS.JWT.ISSUER,
        audience:
          AUTH_CONSTANTS.JWT.AUDIENCE,
      },
    );

  return payload;
}