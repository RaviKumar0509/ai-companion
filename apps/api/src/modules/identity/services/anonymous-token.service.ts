import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { env } from "../../../config/env.js";
import { IDENTITY_CONSTANTS } from "../constants/identity.constants.js";

function getAnonymousAccessTokenSecret(): Uint8Array {
  return new TextEncoder().encode(env.JWT_ACCESS_SECRET);
}

export async function generateAnonymousAccessToken(
  anonymousId: string,
): Promise<string> {
  const secret = getAnonymousAccessTokenSecret();

  return new SignJWT({
    anonymous: true,
  })
    .setProtectedHeader({
      alg: IDENTITY_CONSTANTS.ANONYMOUS.JWT.ALGORITHM,
      typ: "JWT",
    })
    .setSubject(anonymousId)
    .setIssuer(IDENTITY_CONSTANTS.ANONYMOUS.JWT.ISSUER)
    .setAudience(IDENTITY_CONSTANTS.ANONYMOUS.JWT.AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(
      IDENTITY_CONSTANTS.ANONYMOUS.JWT.ACCESS_TOKEN_EXPIRES_IN,
    )
    .sign(secret);
}

export async function verifyAnonymousAccessToken(
  accessToken: string,
): Promise<JWTPayload> {
  const secret = getAnonymousAccessTokenSecret();

  const { payload } = await jwtVerify(accessToken, secret, {
    algorithms: [IDENTITY_CONSTANTS.ANONYMOUS.JWT.ALGORITHM],
    issuer: IDENTITY_CONSTANTS.ANONYMOUS.JWT.ISSUER,
    audience: IDENTITY_CONSTANTS.ANONYMOUS.JWT.AUDIENCE,
  });

  return payload;
}