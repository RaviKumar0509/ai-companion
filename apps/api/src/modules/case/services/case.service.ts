import { ObjectId } from "mongodb";

import {
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/index.js";

import {
  createCase,
  findActiveCaseByAnonymousId,
  findActiveCaseByUserId,
  findCaseById,
  findCasesByAnonymousId,
  findCasesByUserId,
  updateCase,
} from "../repositories/case.repository.js";

import {
  CASE_OWNER_TYPE,
  CASE_STATUS,
  type CaseDocument,
  type CaseStatus,
} from "../types/case.types.js";

export interface CreateUserCaseInput {
  userId: string;
  concernType?: string;
  title?: string;
}

export interface CreateAnonymousCaseInput {
  anonymousId: string;
  concernType?: string;
  title?: string;
}

export interface ListCasesOptions {
  status?: CaseStatus;
  limit?: number;
  skip?: number;
}

export interface UpdateCaseInput {
  concernType?: string | undefined;
  title?: string | undefined;
  status?: CaseStatus | undefined;
}
export async function createUserCase(
  input: CreateUserCaseInput,
): Promise<CaseDocument> {
  if (!ObjectId.isValid(input.userId)) {
    throw new ValidationError("Invalid user ID.");
  }

  const userId = new ObjectId(input.userId);
  const now = new Date();

  const caseDocument: CaseDocument = {
    ownerType: CASE_OWNER_TYPE.USER,
    userId,
    status: CASE_STATUS.ACTIVE,
    ...(input.concernType !== undefined && {
      concernType: input.concernType,
    }),
    ...(input.title !== undefined && {
      title: input.title,
    }),
    createdAt: now,
    updatedAt: now,
  };

  return createCase(caseDocument);
}

export async function createAnonymousCase(
  input: CreateAnonymousCaseInput,
): Promise<CaseDocument> {
  if (!input.anonymousId) {
    throw new ValidationError("Anonymous ID is required.");
  }

  const now = new Date();

  const caseDocument: CaseDocument = {
    ownerType: CASE_OWNER_TYPE.ANONYMOUS,
    anonymousId: input.anonymousId,
    status: CASE_STATUS.ACTIVE,
    ...(input.concernType !== undefined && {
      concernType: input.concernType,
    }),
    ...(input.title !== undefined && {
      title: input.title,
    }),
    createdAt: now,
    updatedAt: now,
  };

  return createCase(caseDocument);
}

export async function getCaseByIdForUser(
  caseId: string,
  userId: string,
): Promise<CaseDocument> {
  if (!ObjectId.isValid(caseId)) {
    throw new ValidationError("Invalid case ID.");
  }

  if (!ObjectId.isValid(userId)) {
    throw new ValidationError("Invalid user ID.");
  }

  const caseDocument = await findCaseById(
    new ObjectId(caseId),
  );

  if (
    !caseDocument ||
    caseDocument.ownerType !== CASE_OWNER_TYPE.USER ||
    caseDocument.userId?.toString() !== userId
  ) {
    throw new NotFoundError("Case not found.");
  }

  return caseDocument;
}

export async function getCaseByIdForAnonymous(
  caseId: string,
  anonymousId: string,
): Promise<CaseDocument> {
  if (!ObjectId.isValid(caseId)) {
    throw new ValidationError("Invalid case ID.");
  }

  if (!anonymousId) {
    throw new ValidationError("Anonymous ID is required.");
  }

  const caseDocument = await findCaseById(
    new ObjectId(caseId),
  );

  if (
    !caseDocument ||
    caseDocument.ownerType !== CASE_OWNER_TYPE.ANONYMOUS ||
    caseDocument.anonymousId !== anonymousId
  ) {
    throw new NotFoundError("Case not found.");
  }

  return caseDocument;
}

export async function getActiveCaseForUser(
  userId: string,
): Promise<CaseDocument | null> {
  if (!ObjectId.isValid(userId)) {
    throw new ValidationError("Invalid user ID.");
  }

  return findActiveCaseByUserId(
    new ObjectId(userId),
  );
}

export async function getActiveCaseForAnonymous(
  anonymousId: string,
): Promise<CaseDocument | null> {
  if (!anonymousId) {
    throw new ValidationError("Anonymous ID is required.");
  }

  return findActiveCaseByAnonymousId(
    anonymousId,
  );
}

export async function listUserCases(
  userId: string,
  options?: ListCasesOptions,
): Promise<CaseDocument[]> {
  if (!ObjectId.isValid(userId)) {
    throw new ValidationError("Invalid user ID.");
  }

  return findCasesByUserId(
    new ObjectId(userId),
    options,
  );
}

export async function listAnonymousCases(
  anonymousId: string,
  options?: ListCasesOptions,
): Promise<CaseDocument[]> {
  if (!anonymousId) {
    throw new ValidationError("Anonymous ID is required.");
  }

  return findCasesByAnonymousId(
    anonymousId,
    options,
  );
}

export async function updateUserCase(
  caseId: string,
  userId: string,
  updates: UpdateCaseInput,
): Promise<CaseDocument> {
  const existingCase = await getCaseByIdForUser(
    caseId,
    userId,
  );

  const normalizedUpdates = buildLifecycleUpdates(
    existingCase,
    updates,
  );

  const didUpdate = await updateCase(
    existingCase._id!,
    normalizedUpdates,
  );

  if (!didUpdate) {
    throw new NotFoundError("Case not found.");
  }

  const updatedCase = await findCaseById(
    existingCase._id!,
  );

  if (!updatedCase) {
    throw new NotFoundError("Case not found.");
  }

  return updatedCase;
}

export async function updateAnonymousCase(
  caseId: string,
  anonymousId: string,
  updates: UpdateCaseInput,
): Promise<CaseDocument> {
  const existingCase = await getCaseByIdForAnonymous(
    caseId,
    anonymousId,
  );

  const normalizedUpdates = buildLifecycleUpdates(
    existingCase,
    updates,
  );

  const didUpdate = await updateCase(
    existingCase._id!,
    normalizedUpdates,
  );

  if (!didUpdate) {
    throw new NotFoundError("Case not found.");
  }

  const updatedCase = await findCaseById(
    existingCase._id!,
  );

  if (!updatedCase) {
    throw new NotFoundError("Case not found.");
  }

  return updatedCase;
}

function buildLifecycleUpdates(
  existingCase: CaseDocument,
  updates: UpdateCaseInput,
): Partial<
  Pick<
    CaseDocument,
    | "status"
    | "concernType"
    | "title"
    | "updatedAt"
    | "closedAt"
    | "archivedAt"
  >
> {
  const now = new Date();

  const nextStatus = updates.status ?? existingCase.status;

  validateStatusTransition(
    existingCase.status,
    nextStatus,
  );

  const result: Partial<
    Pick<
      CaseDocument,
      | "status"
      | "concernType"
      | "title"
      | "updatedAt"
      | "closedAt"
      | "archivedAt"
    >
  > = {
    updatedAt: now,
  };

  if (updates.concernType !== undefined) {
    result.concernType = updates.concernType;
  }

  if (updates.title !== undefined) {
    result.title = updates.title;
  }

  if (updates.status !== undefined) {
    result.status = updates.status;
  }

  if (
    existingCase.status !== CASE_STATUS.CLOSED &&
    nextStatus === CASE_STATUS.CLOSED
  ) {
    result.closedAt = now;
  }

  if (
    existingCase.status !== CASE_STATUS.ARCHIVED &&
    nextStatus === CASE_STATUS.ARCHIVED
  ) {
    result.archivedAt = now;
  }

  return result;
}

function validateStatusTransition(
  currentStatus: CaseStatus,
  nextStatus: CaseStatus,
): void {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowedTransitions: Record<
    CaseStatus,
    CaseStatus[]
  > = {
    [CASE_STATUS.ACTIVE]: [
      CASE_STATUS.CLOSED,
      CASE_STATUS.ARCHIVED,
    ],
    [CASE_STATUS.CLOSED]: [
      CASE_STATUS.ARCHIVED,
    ],
    [CASE_STATUS.ARCHIVED]: [],
  };

  if (!allowedTransitions[currentStatus].includes(nextStatus)) {
    throw new ValidationError(
      `Invalid case status transition from "${currentStatus}" to "${nextStatus}".`,
    );
  }
}