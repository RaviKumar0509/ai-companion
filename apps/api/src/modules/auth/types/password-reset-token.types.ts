import type {
  ObjectId,
} from "mongodb";

export const PASSWORD_RESET_TOKEN_STATUS = {
  ACTIVE: "active",
  USED: "used",
  REVOKED: "revoked",
} as const;

export type PasswordResetTokenStatus =
  (typeof PASSWORD_RESET_TOKEN_STATUS)[keyof typeof PASSWORD_RESET_TOKEN_STATUS];

export interface PasswordResetTokenDocument {
  _id?: ObjectId;

  /*
   * SHA-256 hash of the raw password-reset token.
   *
   * The raw token is never persisted.
   */
  tokenHash: string;

  userId: ObjectId;

  status: PasswordResetTokenStatus;

  issuedAt: Date;

  expiresAt: Date;

  usedAt?: Date;

  revokedAt?: Date;
}