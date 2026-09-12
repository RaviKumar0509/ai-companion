import type { ObjectId } from "mongodb";

export const ANONYMOUS_IDENTITY_STATUS = {
  ACTIVE: "active",
  REVOKED: "revoked",
  EXPIRED: "expired",
} as const;

export type AnonymousIdentityStatus =
  (typeof ANONYMOUS_IDENTITY_STATUS)[keyof typeof ANONYMOUS_IDENTITY_STATUS];

export interface AnonymousIdentityDocument {
  _id?: ObjectId;

  anonymousId: string;
  anonymousSecretHash: string;

  status: AnonymousIdentityStatus;

  deviceId: string;

  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;

  convertedToUserId?: ObjectId;
  convertedAt?: Date;
}