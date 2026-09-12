import type {
  ObjectId,
} from "mongodb";

export const REFRESH_TOKEN_STATUS = {
  ACTIVE: "active",
  USED: "used",
  REVOKED: "revoked",
} as const;

export type RefreshTokenStatus =
  (typeof REFRESH_TOKEN_STATUS)[keyof typeof REFRESH_TOKEN_STATUS];

export interface RefreshTokenDocument {
  _id?: ObjectId;

  tokenHash: string;

  sessionId: string;

  tokenFamilyId: string;

  version: number;

  status: RefreshTokenStatus;

  issuedAt: Date;

  usedAt?: Date;

  revokedAt?: Date;

  expiresAt: Date;
}