import { ObjectId } from "mongodb";

import { ValidationError } from "../../../shared/errors/index.js";

import {
  createSafetyEvent,
  listActiveSafetyEventsByCaseId,
  resolveSafetyEventById,
} from "../repositories/safety.repository.js";

import {
  SAFETY_CONSTANTS,
} from "../constants/safety.constants.js";


import {
  SAFETY_EVENT_SOURCE,
  type SafetyEventDocument,
  type SafetyEventSource,
  type SafetyResult,
} from "../types/safety.types.js";

export interface PersistSafetyEventInput {
  conversationId: ObjectId;
  caseId: ObjectId;
  ownerType: "user" | "anonymous";
  userId?: ObjectId;
  anonymousId?: string;
  safetyResult: SafetyResult;
  source?: SafetyEventSource;
}

export async function listActiveSafetyEvents(
  caseId: ObjectId,
  limit = SAFETY_CONSTANTS.DEFAULT_ACTIVE_EVENT_LIMIT,
): Promise<SafetyEventDocument[]> {
  const normalizedLimit = Math.min(
    Math.max(1, limit),
    SAFETY_CONSTANTS.MAX_ACTIVE_EVENT_LIMIT,
  );

  return listActiveSafetyEventsByCaseId(
    caseId,
    normalizedLimit,
  );
}
export async function persistSafetyEvent(
  input: PersistSafetyEventInput,
): Promise<SafetyEventDocument> {
  validateSafetyEventOwner(input);

  const now = new Date();

  const safetyEvent: SafetyEventDocument = {
    conversationId: input.conversationId,
    caseId: input.caseId,
    ownerType: input.ownerType,
    riskLevel: input.safetyResult.riskLevel,
    category: input.safetyResult.category,
    action: input.safetyResult.action,
    source: input.source ?? SAFETY_EVENT_SOURCE.MESSAGE,
    createdAt: now,
  };

  if (input.ownerType === "user" && input.userId) {
    safetyEvent.userId = input.userId;
  }

  if (input.ownerType === "anonymous" && input.anonymousId) {
    safetyEvent.anonymousId = input.anonymousId;
  }

  return createSafetyEvent(safetyEvent);
}

export async function resolveSafetyEvent(
  safetyEventId: ObjectId,
): Promise<boolean> {
  return resolveSafetyEventById(
    safetyEventId,
    new Date(),
  );
}

function validateSafetyEventOwner(
  input: PersistSafetyEventInput,
): void {
  if (input.ownerType === "user") {
    if (!input.userId) {
      throw new ValidationError(
        "User ID is required for a user-owned safety event.",
      );
    }

    if (input.anonymousId) {
      throw new ValidationError(
        "Anonymous ID must not be provided for a user-owned safety event.",
      );
    }

    return;
  }

  if (input.ownerType === "anonymous") {
    if (!input.anonymousId) {
      throw new ValidationError(
        "Anonymous ID is required for an anonymous safety event.",
      );
    }

    if (input.userId) {
      throw new ValidationError(
        "User ID must not be provided for an anonymous safety event.",
      );
    }

    return;
  }

  throw new ValidationError(
    "Invalid safety event owner type.",
  );
}