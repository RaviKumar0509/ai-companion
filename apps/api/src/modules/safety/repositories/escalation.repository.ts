
import { ObjectId } from "mongodb";

import { getDatabase } from "../../../infrastructure/database/db.js";

import type {
  EscalationDocument,
  EscalationStatus,
} from "../types/escalation.types.js";

import {
  ESCALATION_INDEXES,
} from "./escalation.indexes.js";

const COLLECTION_NAME = "escalations";

function getEscalationCollection() {
  return getDatabase().collection<EscalationDocument>(
    COLLECTION_NAME,
  );
}

export async function ensureEscalationIndexes(): Promise<void> {
  await getEscalationCollection().createIndexes(
    [...ESCALATION_INDEXES],
  );
}

export async function createEscalation(
  escalation: EscalationDocument,
): Promise<EscalationDocument> {
  const result = await getEscalationCollection().insertOne(
    escalation,
  );

  return {
    ...escalation,
    _id: result.insertedId,
  };
}

export async function findEscalationBySafetyEventId(
  safetyEventId: ObjectId,
): Promise<EscalationDocument | null> {
  return getEscalationCollection().findOne({
    safetyEventId,
  });
}

export async function findEscalationById(
  escalationId: ObjectId,
): Promise<EscalationDocument | null> {
  return getEscalationCollection().findOne({
    _id: escalationId,
  });
}

export async function listEscalationsByStatus(
  statuses: EscalationStatus[],
  limit: number,
  skip = 0,
): Promise<EscalationDocument[]> {
  return getEscalationCollection()
    .find({
      status: {
        $in: statuses,
      },
    })
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .toArray();
}
