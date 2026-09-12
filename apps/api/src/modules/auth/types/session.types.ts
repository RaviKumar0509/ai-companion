import type {
  ObjectId,
} from "mongodb";

export const SESSION_STATUS = {
  ACTIVE: "active",
  REVOKED: "revoked",
  EXPIRED: "expired",
} as const;

export type SessionStatus =
  (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

export interface SessionDocument {
  _id?: ObjectId;

  userId: ObjectId;

  status: SessionStatus;

  /**
   * Random identifier representing this
   * authentication session.
   */
  sessionId: string;

  /**
   * Hash of the current refresh token.
   *
   * We NEVER store the raw refresh token.
   */
  refreshTokenHash: string;

  /**
   * Refresh-token rotation family.
   *
   * Every rotated refresh token belonging
   * to the same login session shares this ID.
   */
  tokenFamilyId: string;

  /**
   * Number of successful refresh rotations.
   */
  refreshTokenVersion: number;

  /**
   * Optional device/application information.
   */
  deviceId?: string;

  deviceName?: string;

  platform?: "web" | "android" | "ios";

  userAgent?: string;

  ipAddress?: string;

  createdAt: Date;

  lastUsedAt: Date;

  expiresAt: Date;

  revokedAt?: Date;

  revokedReason?: string;
}