import type { ObjectId } from "mongodb";

export const CASE_CONTEXT_VERSION = 1 as const;

export const CASE_CONTEXT_STATUS = {
  ACTIVE: "active",
  EMPTY: "empty",
} as const;

export type CaseContextStatus =
  (typeof CASE_CONTEXT_STATUS)[keyof typeof CASE_CONTEXT_STATUS];

export interface CaseContextDocument {
  _id?: ObjectId;

  caseId: ObjectId;

  version: typeof CASE_CONTEXT_VERSION;

  status: CaseContextStatus;

  summary?: string;

  recoveryGoals?: string[];

  knownTriggers?: string[];

  copingStrategies?: string[];

  supportPreferences?: string[];

  riskNotes?: string[];

  updatedAt: Date;

  createdAt: Date;
}