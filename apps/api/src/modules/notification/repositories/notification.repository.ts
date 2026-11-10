
import { randomUUID } from "node:crypto";
import { MongoServerError, ObjectId } from "mongodb";

import { getDatabase } from "../../../infrastructure/database/db.js";

import {
  NOTIFICATION_STATUS,
  type NotificationDocument,
} from "../types/notification.types.js";

import { NOTIFICATION_INDEXES } from "./notification.indexes.js";

const COLLECTION_NAME = "notifications";

function getNotificationCollection() {
  return getDatabase().collection<NotificationDocument>(
    COLLECTION_NAME,
  );
}

export async function ensureNotificationIndexes(): Promise<void> {
  await getNotificationCollection().createIndexes([
    ...NOTIFICATION_INDEXES,
  ]);
}

export async function createNotification(
  notification: NotificationDocument,
): Promise<NotificationDocument> {
  const result = await getNotificationCollection().insertOne(
    notification,
  );

  return {
    ...notification,
    _id: result.insertedId,
  };
}

export async function findNotificationByEscalationId(
  escalationId: ObjectId,
): Promise<NotificationDocument | null> {
  return getNotificationCollection().findOne({
    escalationId,
  });
}

export async function claimNextNotification(
  now: Date,
  leaseDurationMs: number,
  maxAttempts: number,
): Promise<NotificationDocument | null> {
  const leaseToken = randomUUID();
  const leaseUntil = new Date(
    now.getTime() + leaseDurationMs,
  );

  return getNotificationCollection().findOneAndUpdate(
    {
      "delivery.attempts": { $lt: maxAttempts },
      $or: [
        {
          "delivery.status": NOTIFICATION_STATUS.PENDING,
          "delivery.nextAttemptAt": { $lte: now },
        },
        {
          "delivery.status": NOTIFICATION_STATUS.PROCESSING,
          "delivery.leaseUntil": { $lte: now },
        },
      ],
    },
    {
      $set: {
        "delivery.status": NOTIFICATION_STATUS.PROCESSING,
        "delivery.leaseUntil": leaseUntil,
        "delivery.leaseToken": leaseToken,
        "delivery.updatedAt": now,
      },
      $inc: {
        "delivery.attempts": 1,
      },
    },
    {
      sort: { createdAt: 1 },
      returnDocument: "after",
      includeResultMetadata: false,
    },
  );
}

export async function completeNotificationDelivery(
  notificationId: ObjectId,
  leaseToken: string,
  now: Date,
): Promise<boolean> {
  const result = await getNotificationCollection().updateOne(
    {
      _id: notificationId,
      "delivery.status": NOTIFICATION_STATUS.PROCESSING,
      "delivery.leaseToken": leaseToken,
      "delivery.leaseUntil": { $gt: now },
    },
    {
      $set: {
        "delivery.status": NOTIFICATION_STATUS.DELIVERED,
        "delivery.deliveredAt": now,
        "delivery.updatedAt": now,
      },
      $unset: {
        "delivery.leaseUntil": "",
        "delivery.leaseToken": "",
        "delivery.lastErrorName": "",
      },
    },
  );

  return result.modifiedCount === 1;
}

export async function retryNotificationDelivery(
  notificationId: ObjectId,
  leaseToken: string,
  nextAttemptAt: Date,
  errorName: string,
  now: Date,
): Promise<boolean> {
  const result = await getNotificationCollection().updateOne(
    {
      _id: notificationId,
      "delivery.status": NOTIFICATION_STATUS.PROCESSING,
      "delivery.leaseToken": leaseToken,
      "delivery.leaseUntil": { $gt: now },
    },
    {
      $set: {
        "delivery.status": NOTIFICATION_STATUS.PENDING,
        "delivery.nextAttemptAt": nextAttemptAt,
        "delivery.lastErrorName": errorName,
        "delivery.updatedAt": now,
      },
      $unset: {
        "delivery.leaseUntil": "",
        "delivery.leaseToken": "",
      },
    },
  );

  return result.modifiedCount === 1;
}

export async function deadLetterNotification(
  notificationId: ObjectId,
  leaseToken: string,
  errorName: string,
  now: Date,
): Promise<boolean> {
  const result = await getNotificationCollection().updateOne(
    {
      _id: notificationId,
      "delivery.status": NOTIFICATION_STATUS.PROCESSING,
      "delivery.leaseToken": leaseToken,
      "delivery.leaseUntil": { $gt: now },
    },
    {
      $set: {
        "delivery.status": NOTIFICATION_STATUS.DEAD_LETTER,
        "delivery.lastErrorName": errorName,
        "delivery.updatedAt": now,
      },
      $unset: {
        "delivery.leaseUntil": "",
        "delivery.leaseToken": "",
      },
    },
  );

  return result.modifiedCount === 1;
}

export async function deadLetterExhaustedNotifications(
  maxAttempts: number,
  now: Date,
): Promise<number> {
  const result = await getNotificationCollection().updateMany(
    {
      "delivery.status": NOTIFICATION_STATUS.PROCESSING,
      "delivery.attempts": { $gte: maxAttempts },
      "delivery.leaseUntil": { $lte: now },
    },
    {
      $set: {
        "delivery.status": NOTIFICATION_STATUS.DEAD_LETTER,
        "delivery.lastErrorName": "MAX_RETRY_ATTEMPTS_EXCEEDED",
        "delivery.updatedAt": now,
      },
      $unset: {
        "delivery.leaseUntil": "",
        "delivery.leaseToken": "",
      },
    },
  );

  return result.modifiedCount;
}

export async function claimNotificationById(
  notificationId: ObjectId,
  now: Date,
  leaseUntil: Date,
  maxAttempts: number,
): Promise<NotificationDocument | null> {
  return getNotificationCollection().findOneAndUpdate(
    {
      _id: notificationId,
      "delivery.attempts": { $lt: maxAttempts },
      $or: [
        {
          "delivery.status": NOTIFICATION_STATUS.PENDING,
          "delivery.nextAttemptAt": { $lte: now },
        },
        {
          "delivery.status": NOTIFICATION_STATUS.PROCESSING,
          "delivery.leaseUntil": { $lte: now },
        },
      ],
    },
    {
      $set: {
        "delivery.status": NOTIFICATION_STATUS.PROCESSING,
        "delivery.leaseUntil": leaseUntil,
        "delivery.leaseToken": randomUUID(),
        "delivery.updatedAt": now,
      },
      $inc: {
        "delivery.attempts": 1,
      },
    },
    {
      returnDocument: "after",
      includeResultMetadata: false,
    },
  );
}