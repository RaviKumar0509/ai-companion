import type { Collection, ObjectId } from "mongodb";

import { getDatabase } from "../../../infrastructure/database/db.js";

import type { UpdateCaseContextInput } from "../schemas/case-context.schemas.js";

import type { CaseContextDocument } from "../types/case-context.types.js";

const COLLECTION_NAME = "case_contexts";

function getCaseContextCollection(): Collection<CaseContextDocument> {
  return getDatabase().collection<CaseContextDocument>(COLLECTION_NAME);
}

export async function findCaseContextByCaseId(
  caseId: ObjectId,
): Promise<CaseContextDocument | null> {
  return getCaseContextCollection().findOne({ caseId });
}

export async function createCaseContext(
  context: CaseContextDocument,
): Promise<CaseContextDocument> {
  await getCaseContextCollection().insertOne(context);

  return context;
}

export async function updateCaseContext(
  caseId: ObjectId,
  updates: UpdateCaseContextInput,
  updatedAt: Date,
): Promise<boolean> {
  const sanitizedUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined),
  ) as Partial<CaseContextDocument>;

  const result = await getCaseContextCollection().updateOne(
    { caseId },
    {
      $set: {
        ...sanitizedUpdates,
        updatedAt,
      },
    },
  );

  return result.modifiedCount === 1;
}