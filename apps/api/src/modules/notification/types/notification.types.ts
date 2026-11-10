
import type { ObjectId } from "mongodb";

export const NOTIFICATION_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  DELIVERED: "delivered",
  DEAD_LETTER: "dead_letter",
} as const;

export type NotificationStatus =
  (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];

export const NOTIFICATION_CHANNEL = {
  EMAIL: "email",
} as const;

export type NotificationChannel =
  (typeof NOTIFICATION_CHANNEL)[keyof typeof NOTIFICATION_CHANNEL];

export interface NotificationDeliveryState {
  status: NotificationStatus;
  attempts: number;
  nextAttemptAt: Date;
  leaseUntil?: Date;
  leaseToken?: string;
  lastErrorName?: string;
  deliveredAt?: Date;
  updatedAt: Date;
}

export interface NotificationDocument {
  _id?: ObjectId;

  // One notification per escalation.
  escalationId: ObjectId;

  safetyEventId: ObjectId;
  caseId: ObjectId;

  channel: NotificationChannel;

  // Clinician email recipients.
  recipients: string[];

  // Keep payload minimal. Never store message transcripts here.
  subject: string;
  text: string;

  delivery: NotificationDeliveryState;

  createdAt: Date;
  updatedAt: Date;
}
