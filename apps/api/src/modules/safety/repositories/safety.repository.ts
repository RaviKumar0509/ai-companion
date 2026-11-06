
import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";

import { getDatabase } from "../../../infrastructure/database/db.js";

import {
  ESCALATION_RECOVERY_STATUS,
  type SafetyEventDocument,
} from "../types/safety.types.js";

import {
  SAFETY_EVENT_INDEXES,
} from "./safety.indexes.js";

const COLLECTION_NAME = "safety_events";

function getSafetyEventCollection() {
  return getDatabase().collection<SafetyEventDocument>(
    COLLECTION_NAME,
  );
}

export async function ensureSafetyEventIndexes(): Promise<void> {
  await getSafetyEventCollection().createIndexes(
    [...SAFETY_EVENT_INDEXES],
  );
}

export async function createSafetyEvent(
  event: SafetyEventDocument,
): Promise<SafetyEventDocument> {
  const result = await getSafetyEventCollection().insertOne(event);

  return {
    ...event,
    _id: result.insertedId,
  };
}

export async function findSafetyEventById(
  safetyEventId: ObjectId,
): Promise<SafetyEventDocument | null> {
  return getSafetyEventCollection().findOne({
    _id: safetyEventId,
  });
}

export async function listSafetyEventsByConversationId(
  conversationId: ObjectId,
  limit: number,
): Promise<SafetyEventDocument[]> {
  return getSafetyEventCollection()
    .find({ conversationId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function listSafetyEventsByCaseId(
  caseId: ObjectId,
  limit: number,
): Promise<SafetyEventDocument[]> {
  return getSafetyEventCollection()
    .find({ caseId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function listActiveSafetyEventsByCaseId(
  caseId: ObjectId,
  limit: number,
): Promise<SafetyEventDocument[]> {
  return getSafetyEventCollection()
    .find({
      caseId,
      resolvedAt: { $exists: false },
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function resolveSafetyEventById(
  safetyEventId: ObjectId,
  resolvedAt: Date,
): Promise<boolean> {
  const result = await getSafetyEventCollection().updateOne(
    {
      _id: safetyEventId,
      resolvedAt: { $exists: false },
    },
    {
      $set: { resolvedAt },
    },
  );

  return result.modifiedCount === 1;
}

// --------------------------------------------------
// ESCALATION RECOVERY OPERATIONS
// --------------------------------------------------

const RECOVERY_STATUS = ESCALATION_RECOVERY_STATUS;

/**
 * Atomically claims a specific safety event.
 * Every claim receives a unique ownership token.
 */
export async function claimSafetyEventEscalationById(
  safetyEventId: ObjectId,
  now: Date,
  leaseUntil: Date,
  maxAttempts: number,
): Promise<SafetyEventDocument | null> {
  const leaseToken = randomUUID();

  return getSafetyEventCollection().findOneAndUpdate(
    {
      _id: safetyEventId,
      action: "crisis",
      riskLevel: "high",
      "escalationRecovery.attempts": { $lt: maxAttempts },
      $or: [
        {
          "escalationRecovery.status": RECOVERY_STATUS.PENDING,
          "escalationRecovery.nextAttemptAt": { $lte: now },
        },
        {
          "escalationRecovery.status": RECOVERY_STATUS.PROCESSING,
          "escalationRecovery.leaseUntil": { $lte: now },
        },
      ],
    },
    {
      $set: {
        "escalationRecovery.status": RECOVERY_STATUS.PROCESSING,
        "escalationRecovery.leaseUntil": leaseUntil,
        "escalationRecovery.leaseToken": leaseToken,
        "escalationRecovery.updatedAt": now,
      },
      $inc: {
        "escalationRecovery.attempts": 1,
      },
    },
    {
      returnDocument: "after",
      includeResultMetadata: false,
    },
  );
}

/**
 * Claims the next eligible safety event.
 */
export async function claimNextSafetyEventEscalation(
  now: Date,
  leaseUntil: Date,
  maxAttempts: number,
): Promise<SafetyEventDocument | null> {
  const leaseToken = randomUUID();

  return getSafetyEventCollection().findOneAndUpdate(
    {
      action: "crisis",
      riskLevel: "high",
      "escalationRecovery.attempts": { $lt: maxAttempts },
      $or: [
        {
          "escalationRecovery.status": RECOVERY_STATUS.PENDING,
          "escalationRecovery.nextAttemptAt": { $lte: now },
        },
        {
          "escalationRecovery.status": RECOVERY_STATUS.PROCESSING,
          "escalationRecovery.leaseUntil": { $lte: now },
        },
      ],
    },
    {
      $set: {
        "escalationRecovery.status": RECOVERY_STATUS.PROCESSING,
        "escalationRecovery.leaseUntil": leaseUntil,
        "escalationRecovery.leaseToken": leaseToken,
        "escalationRecovery.updatedAt": now,
      },
      $inc: {
        "escalationRecovery.attempts": 1,
      },
    },
    {
      sort: { createdAt: 1 },
      returnDocument: "after",
      includeResultMetadata: false,
    },
  );
}

/**
 * Marks processing as completed only for the current lease owner.
 */
export async function completeSafetyEventEscalation(
  safetyEventId: ObjectId,
  leaseToken: string,
  now: Date,
): Promise<boolean> {
  const result = await getSafetyEventCollection().updateOne(
    {
      _id: safetyEventId,
      "escalationRecovery.status": RECOVERY_STATUS.PROCESSING,
      "escalationRecovery.leaseToken": leaseToken,
      "escalationRecovery.leaseUntil": { $gt: now },
    },
    {
      $set: {
        "escalationRecovery.status": RECOVERY_STATUS.COMPLETED,
        "escalationRecovery.completedAt": now,
        "escalationRecovery.updatedAt": now,
      },
      $unset: {
        "escalationRecovery.leaseUntil": "",
        "escalationRecovery.leaseToken": "",
        "escalationRecovery.lastErrorName": "",
      },
    },
  );

  return result.modifiedCount === 1;
}

/**
 * Schedules another attempt for the current lease owner.
 */
export async function retrySafetyEventEscalation(
  safetyEventId: ObjectId,
  leaseToken: string,
  nextAttemptAt: Date,
  errorName: string,
  now: Date,
): Promise<boolean> {
  const result = await getSafetyEventCollection().updateOne(
    {
      _id: safetyEventId,
      "escalationRecovery.status": RECOVERY_STATUS.PROCESSING,
      "escalationRecovery.leaseToken": leaseToken,
      "escalationRecovery.leaseUntil": { $gt: now },
    },
    {
      $set: {
        "escalationRecovery.status": RECOVERY_STATUS.PENDING,
        "escalationRecovery.nextAttemptAt": nextAttemptAt,
        "escalationRecovery.lastErrorName": errorName,
        "escalationRecovery.updatedAt": now,
      },
      $unset: {
        "escalationRecovery.leaseUntil": "",
        "escalationRecovery.leaseToken": "",
      },
    },
  );

  return result.modifiedCount === 1;
}

/**
 * Moves a failed event to dead-letter for the current lease owner.
 */
export async function deadLetterSafetyEventEscalation(
  safetyEventId: ObjectId,
  leaseToken: string,
  errorName: string,
  now: Date,
): Promise<boolean> {
  const result = await getSafetyEventCollection().updateOne(
    {
      _id: safetyEventId,
      "escalationRecovery.status": RECOVERY_STATUS.PROCESSING,
      "escalationRecovery.leaseToken": leaseToken,
      "escalationRecovery.leaseUntil": { $gt: now },
    },
    {
      $set: {
        "escalationRecovery.status": RECOVERY_STATUS.DEAD_LETTER,
        "escalationRecovery.lastErrorName": errorName,
        "escalationRecovery.updatedAt": now,
      },
      $unset: {
        "escalationRecovery.leaseUntil": "",
        "escalationRecovery.leaseToken": "",
      },
    },
  );

  return result.modifiedCount === 1;
}

/**
 * Recovers events that exhausted their attempts and whose
 * processing leases have expired.
 */
export async function deadLetterExhaustedSafetyEscalations(
  maxAttempts: number,
  now: Date,
): Promise<number> {
  const result = await getSafetyEventCollection().updateMany(
    {
      action: "crisis",
      riskLevel: "high",
      "escalationRecovery.status": RECOVERY_STATUS.PROCESSING,
      "escalationRecovery.attempts": { $gte: maxAttempts },
      "escalationRecovery.leaseUntil": { $lte: now },
    },
    {
      $set: {
        "escalationRecovery.status": RECOVERY_STATUS.DEAD_LETTER,
        "escalationRecovery.lastErrorName":
          "MAX_RETRY_ATTEMPTS_EXCEEDED",
        "escalationRecovery.updatedAt": now,
      },
      $unset: {
        "escalationRecovery.leaseUntil": "",
        "escalationRecovery.leaseToken": "",
      },
    },
  );

  return result.modifiedCount;
}
