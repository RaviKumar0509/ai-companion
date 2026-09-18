import type {
  Collection,
  InsertOneResult,
  ObjectId,
  UpdateResult,
} from "mongodb";

import { getCollection } from "../../../infrastructure/database/db.js";

import type {
  CaseDocument,
  CaseStatus,
} from "../types/case.types.js";

const CASES_COLLECTION = "cases";

function getCaseCollection(): Collection<CaseDocument> {
  return getCollection<CaseDocument>(CASES_COLLECTION);
}

export async function createCase(
  caseDocument: CaseDocument,
): Promise<CaseDocument> {
  const result: InsertOneResult<CaseDocument> =
    await getCaseCollection().insertOne(caseDocument);

  if (!result.acknowledged) {
    throw new Error(
      "Case creation was not acknowledged by MongoDB.",
    );
  }

  return {
    ...caseDocument,
    _id: result.insertedId,
  };
}

export async function findCaseById(
  caseId: ObjectId,
): Promise<CaseDocument | null> {
  return getCaseCollection().findOne({
    _id: caseId,
  });
}

export async function findActiveCaseByUserId(
  userId: ObjectId,
): Promise<CaseDocument | null> {
  return getCaseCollection().findOne(
    {
      ownerType: "user",
      userId,
      status: "active",
    },
    {
      sort: {
        updatedAt: -1,
      },
    },
  );
}

export async function findActiveCaseByAnonymousId(
  anonymousId: string,
): Promise<CaseDocument | null> {
  return getCaseCollection().findOne(
    {
      ownerType: "anonymous",
      anonymousId,
      status: "active",
    },
    {
      sort: {
        updatedAt: -1,
      },
    },
  );
}

export async function findCasesByUserId(
  userId: ObjectId,
  options?: {
    status?: CaseStatus;
    limit?: number;
    skip?: number;
  },
): Promise<CaseDocument[]> {
  const limit = options?.limit ?? 20;
  const skip = options?.skip ?? 0;

  const filter: {
    ownerType: "user";
    userId: ObjectId;
    status?: CaseStatus;
  } = {
    ownerType: "user",
    userId,
  };

  if (options?.status !== undefined) {
    filter.status = options.status;
  }

  return getCaseCollection()
    .find(filter)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
}

export async function findCasesByAnonymousId(
  anonymousId: string,
  options?: {
    status?: CaseStatus;
    limit?: number;
    skip?: number;
  },
): Promise<CaseDocument[]> {
  const limit = options?.limit ?? 20;
  const skip = options?.skip ?? 0;

  const filter: {
    ownerType: "anonymous";
    anonymousId: string;
    status?: CaseStatus;
  } = {
    ownerType: "anonymous",
    anonymousId,
  };

  if (options?.status !== undefined) {
    filter.status = options.status;
  }

  return getCaseCollection()
    .find(filter)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
}

export async function updateCase(
  caseId: ObjectId,
  updates: Partial<
    Pick<
      CaseDocument,
      "status" | "concernType" | "title" | "updatedAt" | "closedAt" | "archivedAt"
    >
  >,
): Promise<boolean> {
  const result: UpdateResult<CaseDocument> =
    await getCaseCollection().updateOne(
      {
        _id: caseId,
      },
      {
        $set: updates,
      },
    );

  return result.modifiedCount === 1;
}