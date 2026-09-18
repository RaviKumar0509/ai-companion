import type { ObjectId } from "mongodb";

export const CASE_STATUS = {
  ACTIVE: "active",
  CLOSED: "closed",
  ARCHIVED: "archived",
} as const;

export type CaseStatus =
  (typeof CASE_STATUS)[keyof typeof CASE_STATUS];

export const CASE_OWNER_TYPE = {
  USER: "user",
  ANONYMOUS: "anonymous",
} as const;

export type CaseOwnerType =
  (typeof CASE_OWNER_TYPE)[keyof typeof CASE_OWNER_TYPE];

export interface CaseDocument {
  _id?: ObjectId;

  ownerType: CaseOwnerType;

  /*
   * Exactly one owner identifier should be populated:
   *
   * USER      → userId
   * ANONYMOUS → anonymousId
   */
  userId?: ObjectId;
  anonymousId?: string;

  status: CaseStatus;

  /*
   * Human-readable recovery/support concern.
   *
   * Examples may include:
   * - substance_use
   * - gambling
   *
   * The authoritative clinical scope remains controlled by
   * product/clinical requirements rather than this enum.
   */
  concernType?: string;

  title?: string;

  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  archivedAt?: Date;
}