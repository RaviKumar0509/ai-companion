
import { MongoServerError, ObjectId } from "mongodb";

import { logger } from "../../../infrastructure/logger/logger.js";

import type {
  SafetyEventDocument,
} from "../types/safety.types.js";

import {
  ESCALATION_STATUS,
  type EscalationDocument,
  type EscalationStatus,
} from "../types/escalation.types.js";

import {
  createEscalation,
  findEscalationBySafetyEventId,
  listEscalationsByStatus,
} from "../repositories/escalation.repository.js";

import {
  claimNextSafetyEventEscalation,
  claimSafetyEventEscalationById,
  completeSafetyEventEscalation,
  deadLetterExhaustedSafetyEscalations,
  deadLetterSafetyEventEscalation,
  retrySafetyEventEscalation,
} from "../repositories/safety.repository.js";

import { createNotificationForEscalation } from "../../notification/services/notification.service.js";

// --------------------------------------------------
// RECOVERY CONFIGURATION
// --------------------------------------------------

const RECOVERY_CONFIG = {
  MAX_ATTEMPTS: 8,
  BASE_DELAY_MS: 5_000,
  MAX_DELAY_MS: 60 * 60 * 1_000,
  LEASE_DURATION_MS: 2 * 60 * 1_000,
  BATCH_SIZE: 10,
} as const;

// --------------------------------------------------
// ESCALATION CREATION
// --------------------------------------------------

export async function createEscalationForSafetyEvent(
  safetyEvent: SafetyEventDocument,
): Promise<EscalationDocument | null> {
  if (safetyEvent.action !== "crisis") {
    return null;
  }

  if (
    !safetyEvent._id ||
    safetyEvent.riskLevel !== "high"
  ) {
    throw new Error(
      "A valid high-risk safety event is required for escalation.",
    );
  }

  const existingEscalation =
    await findEscalationBySafetyEventId(safetyEvent._id);

  if (existingEscalation) {
    return existingEscalation;
  }

  const now = new Date();

  const escalation: EscalationDocument = {
    safetyEventId: safetyEvent._id,
    caseId: safetyEvent.caseId,
    conversationId: safetyEvent.conversationId,
    ownerType: safetyEvent.ownerType,
    riskLevel: "high",
    category: safetyEvent.category,
    status: ESCALATION_STATUS.OPEN,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  try {
    return await createEscalation(escalation);
  } catch (error: unknown) {
    if (
      error instanceof MongoServerError &&
      error.code === 11000
    ) {
      const existing =
        await findEscalationBySafetyEventId(
          safetyEvent._id,
        );

      if (existing) {
        return existing;
      }
    }

    logger.error(
      {
        errorName:
          error instanceof Error
            ? error.name
            : "UnknownError",
        safetyEventId: safetyEvent._id.toHexString(),
        operation: "create-escalation",
      },
      "Failed to create safety escalation",
    );

    throw error;
  }
}

// --------------------------------------------------
// RETRY STRATEGY
// --------------------------------------------------

function calculateRetryDelay(attempt: number): number {
  const exponentialDelay = Math.min(
    RECOVERY_CONFIG.BASE_DELAY_MS *
      2 ** Math.max(0, attempt - 1),
    RECOVERY_CONFIG.MAX_DELAY_MS,
  );

  // Full jitter: random delay between zero and the
  // calculated exponential delay.
  return Math.floor(
    Math.random() * exponentialDelay,
  );
}

function getSafeErrorName(error: unknown): string {
  return error instanceof Error
    ? error.name.slice(0, 100)
    : "UnknownError";
}

// --------------------------------------------------
// PROCESS A CLAIMED SAFETY EVENT
// --------------------------------------------------


async function processClaimedSafetyEvent(
  safetyEvent: SafetyEventDocument,
): Promise<EscalationDocument | null> {
  const safetyEventId = safetyEvent._id;
  const leaseToken =
    safetyEvent.escalationRecovery?.leaseToken;

  if (!safetyEventId) {
    throw new Error(
      "Cannot process a safety event without an ID.",
    );
  }

  if (!leaseToken) {
    throw new Error(
      "Safety event is missing its recovery lease token.",
    );
  }

  try {
    const escalation =
      await createEscalationForSafetyEvent(safetyEvent);

    if (!escalation) {
      throw new Error(
        "Expected a crisis escalation but none was created.",
      );
    }

    await createNotificationForEscalation(escalation);

    const completed = await completeSafetyEventEscalation(
      safetyEventId,
      leaseToken,
      new Date(),
    );

    if (!completed) {
      throw new Error(
        "Escalation completion rejected: lease ownership lost or expired.",
      );
    }

    logger.info(
      {
        safetyEventId: safetyEventId.toHexString(),
        escalationId: escalation._id?.toHexString(),
        operation: "escalation-recovery",
      },
      "Safety escalation processed successfully",
    );

    return escalation;
  } catch (error: unknown) {
    const now = new Date();
    const errorName = getSafeErrorName(error);

    try {
      if (
        (safetyEvent.escalationRecovery?.attempts ?? 0) >=
        RECOVERY_CONFIG.MAX_ATTEMPTS
      ) {
        const updated =
          await deadLetterSafetyEventEscalation(
            safetyEventId,
            leaseToken,
            errorName,
            now,
          );

        if (!updated) {
          logger.warn(
            {
              safetyEventId: safetyEventId.toHexString(),
              operation: "escalation-dead-letter",
            },
            "Dead-letter update rejected because lease ownership was lost or expired",
          );
        } else {
          logger.error(
            {
              safetyEventId: safetyEventId.toHexString(),
              attempts:
                safetyEvent.escalationRecovery?.attempts,
              operation: "escalation-dead-letter",
            },
            "Safety escalation moved to dead-letter",
          );
        }
      } else {
        const delay = calculateRetryDelay(
          safetyEvent.escalationRecovery?.attempts ?? 1,
        );

        const nextAttemptAt = new Date(
          now.getTime() + delay,
        );

        const updated =
          await retrySafetyEventEscalation(
            safetyEventId,
            leaseToken,
            nextAttemptAt,
            errorName,
            now,
          );

        if (!updated) {
          logger.warn(
            {
              safetyEventId: safetyEventId.toHexString(),
              operation: "escalation-retry",
            },
            "Retry update rejected because lease ownership was lost or expired",
          );
        } else {
          logger.warn(
            {
              safetyEventId: safetyEventId.toHexString(),
              errorName,
              nextAttemptAt,
              operation: "escalation-retry",
            },
            "Safety escalation scheduled for retry",
          );
        }
      }
    } catch (recoveryError: unknown) {
      logger.error(
        {
          safetyEventId: safetyEventId.toHexString(),
          errorName: getSafeErrorName(recoveryError),
          operation: "persist-escalation-recovery-state",
        },
        "Unable to persist escalation recovery state",
      );
    }

    throw error;
  }
}


// --------------------------------------------------
// IMMEDIATE PROCESSING
// --------------------------------------------------

export async function processSafetyEventEscalationNow(
  safetyEventId: ObjectId,
): Promise<EscalationDocument | null> {
  const now = new Date();

  const claimedEvent =
    await claimSafetyEventEscalationById(
      safetyEventId,
      now,
      new Date(
        now.getTime() + RECOVERY_CONFIG.LEASE_DURATION_MS,
      ),
      RECOVERY_CONFIG.MAX_ATTEMPTS,
    );

  if (!claimedEvent) {
    return null;
  }

  return processClaimedSafetyEvent(claimedEvent);
}

// --------------------------------------------------
// BACKGROUND RECOVERY PROCESSING
// --------------------------------------------------

export async function processPendingSafetyEscalations(): Promise<number> {
  const now = new Date();

  const deadLettered =
    await deadLetterExhaustedSafetyEscalations(
      RECOVERY_CONFIG.MAX_ATTEMPTS,
      now,
    );

  if (deadLettered > 0) {
    logger.error(
      {
        count: deadLettered,
        operation: "escalation-recovery",
      },
      "Exhausted safety escalations moved to dead-letter",
    );
  }

  let processedCount = 0;

  for (
    let index = 0;
    index < RECOVERY_CONFIG.BATCH_SIZE;
    index += 1
  ) {
    const claimTime = new Date();

    const claimedEvent =
      await claimNextSafetyEventEscalation(
        claimTime,
        new Date(
          claimTime.getTime() +
            RECOVERY_CONFIG.LEASE_DURATION_MS,
        ),
        RECOVERY_CONFIG.MAX_ATTEMPTS,
      );

    if (!claimedEvent) {
      break;
    }

    processedCount += 1;

    try {
      await processClaimedSafetyEvent(claimedEvent);
    } catch {
      // The individual processor has already attempted
      // to persist its retry or dead-letter state.
      // Continue processing the remaining batch.
    }
  }

  return processedCount;
}

// --------------------------------------------------
// ESCALATION QUERIES
// --------------------------------------------------

export async function listOpenEscalations(
  limit = 50,
  skip = 0,
): Promise<EscalationDocument[]> {
  const normalizedLimit = Math.min(
    Math.max(1, limit),
    100,
  );

  const normalizedSkip = Math.max(0, skip);

  const activeStatuses: EscalationStatus[] = [
    ESCALATION_STATUS.OPEN,
    ESCALATION_STATUS.ACKNOWLEDGED,
    ESCALATION_STATUS.ASSIGNED,
    ESCALATION_STATUS.IN_PROGRESS,
  ];

  return listEscalationsByStatus(
    activeStatuses,
    normalizedLimit,
    normalizedSkip,
  );
}
