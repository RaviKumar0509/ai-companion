import type { ObjectId } from "mongodb";

export const CONVERSATION_STATUS = {
  ACTIVE: "active",
  CLOSED: "closed",
} as const;

export type ConversationStatus =
  (typeof CONVERSATION_STATUS)[keyof typeof CONVERSATION_STATUS];

export const CONVERSATION_OWNER_TYPE = {
  USER: "user",
  ANONYMOUS: "anonymous",
} as const;

export type ConversationOwnerType =
  (typeof CONVERSATION_OWNER_TYPE)[keyof typeof CONVERSATION_OWNER_TYPE];

export interface ConversationDocument {
  _id?: ObjectId;

  caseId: ObjectId;

  ownerType: ConversationOwnerType;

  userId?: ObjectId;

  anonymousId?: string;

  status: ConversationStatus;

  startedAt: Date;

  lastMessageAt?: Date;

  closedAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}