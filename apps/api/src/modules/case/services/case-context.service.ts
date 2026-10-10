import type { ObjectId } from "mongodb";

import {
  createCaseContext,
  findCaseContextByCaseId,
  updateCaseContext as updateCaseContextRepository,
} from "../repositories/case-context.repository.js";

import type { UpdateCaseContextInput } from "../schemas/case-context.schemas.js";

import {
  CASE_CONTEXT_STATUS,
  CASE_CONTEXT_VERSION,
  type CaseContextDocument,
} from "../types/case-context.types.js";

export async function getCaseContext(
  caseId: ObjectId,
): Promise<CaseContextDocument | null> {
  return findCaseContextByCaseId(caseId);
}

export async function ensureCaseContext(
  caseId: ObjectId,
): Promise<CaseContextDocument> {
  const existingContext = await findCaseContextByCaseId(caseId);

  if (existingContext) {
    return existingContext;
  }

  const now = new Date();

  const context: CaseContextDocument = {
    caseId,
    version: CASE_CONTEXT_VERSION,
    status: CASE_CONTEXT_STATUS.EMPTY,
    createdAt: now,
    updatedAt: now,
  };

  return createCaseContext(context);
}

export async function updateCaseContextData(
  caseId: ObjectId,
  updates: UpdateCaseContextInput,
): Promise<boolean> {
  return updateCaseContextRepository(caseId, updates, new Date());
}