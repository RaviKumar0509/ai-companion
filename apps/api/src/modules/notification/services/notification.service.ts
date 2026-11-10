
import { MongoServerError } from "mongodb";

import { env } from "../../../config/env.js";
import { logger } from "../../../infrastructure/logger/logger.js";

import type { EscalationDocument } from "../../safety/types/escalation.types.js";

import {
  NOTIFICATION_CHANNEL,
  NOTIFICATION_STATUS,
  type NotificationDocument,
} from "../types/notification.types.js";

import {
  createNotification,
  findNotificationByEscalationId,
} from "../repositories/notification.repository.js";

export async function createNotificationForEscalation(
  escalation: EscalationDocument,
): Promise<NotificationDocument> {
  if (!escalation._id) {
    throw new Error(
      "Cannot create notification without an escalation ID.",
    );
  }

  if (escalation.riskLevel !== "high") {
    throw new Error(
      "Notifications are currently restricted to high-risk escalations.",
    );
  }

  // Check whether a notification already exists.
  const existingNotification =
    await findNotificationByEscalationId(escalation._id);

  if (existingNotification) {
    return existingNotification;
  }

  const now = new Date();

  const notification: NotificationDocument = {
    escalationId: escalation._id,
    safetyEventId: escalation.safetyEventId,
    caseId: escalation.caseId,

    channel: NOTIFICATION_CHANNEL.EMAIL,

    recipients: [...new Set(env.CLINICIAN_ALERT_EMAILS)],

    subject: "High-priority safety escalation requires review",

    text: [
      "A high-priority safety escalation requires clinician review.",
      "",
      `Escalation reference: ${escalation._id.toHexString()}`,
      `Case reference: ${escalation.caseId.toHexString()}`,
      "",
      "Please sign in to the clinician portal to review this escalation.",
      "",
      "This email does not contain conversation transcripts or sensitive user information.",
    ].join("\n"),

    delivery: {
      status: NOTIFICATION_STATUS.PENDING,
      attempts: 0,
      nextAttemptAt: now,
      updatedAt: now,
    },

    createdAt: now,
    updatedAt: now,
  };

  try {
    return await createNotification(notification);
  } catch (error: unknown) {
    // Another worker may have created the notification
    // between our initial lookup and insertion.
    if (
      error instanceof MongoServerError &&
      error.code === 11000
    ) {
      const existing =
        await findNotificationByEscalationId(escalation._id);

      if (existing) {
        return existing;
      }
    }

    logger.error(
      {
        escalationId: escalation._id.toHexString(),
        errorName:
          error instanceof Error
            ? error.name
            : "UnknownError",
        operation: "create-clinician-notification",
      },
      "Failed to persist clinician notification",
    );

    throw error;
  }
}
