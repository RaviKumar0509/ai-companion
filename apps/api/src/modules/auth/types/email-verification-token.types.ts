import type { ObjectId } from "mongodb";

export const EMAIL_VERIFICATION_TOKEN_STATUS = {
  ACTIVE: "active",
  USED: "used",
  REVOKED: "revoked",
} as const;

export type EmailVerificationTokenStatus =
  (typeof EMAIL_VERIFICATION_TOKEN_STATUS)[keyof typeof EMAIL_VERIFICATION_TOKEN_STATUS];

export interface EmailVerificationTokenDocument {
  _id?: ObjectId;

  tokenHash: string;

  userId: ObjectId;

  status: EmailVerificationTokenStatus;

  issuedAt: Date;

  expiresAt: Date;

  usedAt?: Date;

  revokedAt?: Date;
}