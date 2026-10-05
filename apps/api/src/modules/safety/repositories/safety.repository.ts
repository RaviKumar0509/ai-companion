import { ObjectId } from "mongodb";

import { getDatabase } from "../../../infrastructure/database/db.js";

import type {
  SafetyEventDocument,
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
    .find({
      conversationId,
    })
    .sort({
      createdAt: -1,
    })
    .limit(limit)
    .toArray();
}

export async function listSafetyEventsByCaseId(
  caseId: ObjectId,
  limit: number,
): Promise<SafetyEventDocument[]> {
  return getSafetyEventCollection()
    .find({
      caseId,
    })
    .sort({
      createdAt: -1,
    })
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
      $set: {
        resolvedAt,
      },
    },
  );

  return result.modifiedCount === 1;
}