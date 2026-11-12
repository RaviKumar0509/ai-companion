
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

export interface EscalationPaginationResult {
  items: EscalationDocument[];
  total: number;
}

export interface ListEscalationsOptions {
  limit: number;
  skip: number;
  status?: EscalationStatus;
  assignedTo?: ObjectId;
  includeAll: boolean;
}

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

/**
 * Lists escalations using role-aware filtering.
 *
 * Clinicians:
 * Only escalations assigned to their user ID.
 *
 * Administrators:
 * All escalations.
 */
export async function listEscalations(
  options: ListEscalationsOptions,
): Promise<EscalationPaginationResult> {
  const collection = getEscalationCollection();

  const filter: {
    status?: EscalationStatus;
    assignedTo?: ObjectId;
  } = {};

  if (options.status) {
    filter.status = options.status;
  }

  if (!options.includeAll) {
    if (!options.assignedTo) {
      return {
        items: [],
        total: 0,
      };
    }

    filter.assignedTo = options.assignedTo;
  }

  const [items, total] = await Promise.all([
    collection
      .find(filter)
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .skip(options.skip)
      .limit(options.limit)
      .toArray(),

    collection.countDocuments(filter),
  ]);

  return {
    items,
    total,
  };
}
