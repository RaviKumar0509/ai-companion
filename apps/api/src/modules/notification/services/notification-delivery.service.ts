
import { logger } from "../../../infrastructure/logger/logger.js";
import { sendMail } from "../../../infrastructure/notifications/mail/mail.client.js";
import { ObjectId } from "mongodb";

import {
  NOTIFICATION_STATUS,
  type NotificationDocument,
} from "../types/notification.types.js";

import {
  claimNextNotification,
  claimNotificationById,
  completeNotificationDelivery,
  deadLetterExhaustedNotifications,
  deadLetterNotification,
  retryNotificationDelivery,
} from "../repositories/notification.repository.js";

const DELIVERY_CONFIG = {
  MAX_ATTEMPTS: 8,
  BASE_DELAY_MS: 5_000,
  MAX_DELAY_MS: 60 * 60 * 1_000,
  LEASE_DURATION_MS: 2 * 60 * 1_000,
} as const;

function getSafeErrorName(error: unknown): string {
  return error instanceof Error
    ? error.name.slice(0, 100)
    : "UnknownError";
}

function calculateRetryDelay(attempt: number): number {
  const exponentialDelay = Math.min(
    DELIVERY_CONFIG.BASE_DELAY_MS *
      2 ** Math.max(0, attempt - 1),
    DELIVERY_CONFIG.MAX_DELAY_MS,
  );

  return Math.floor(Math.random() * exponentialDelay);
}

async function deliverClaimedNotification(
  notification: NotificationDocument,
): Promise<void> {
  const notificationId = notification._id;
  const leaseToken = notification.delivery.leaseToken;

  if (!notificationId || !leaseToken) {
    throw new Error("Notification is missing its ID or lease token.");
  }

  try {
    if (notification.recipients.length === 0) {
      throw new Error("No clinician recipients configured.");
    }

    await sendMail({
      to: notification.recipients[0],
      bcc: notification.recipients.slice(1),
      subject: notification.subject,
      text: notification.text,
    });

    const completed = await completeNotificationDelivery(
      notificationId,
      leaseToken,
      new Date(),
    );

    if (!completed) {
      logger.error(
        {
          notificationId: notificationId.toHexString(),
          operation: "complete-notification-delivery",
        },
        "Email was sent but notification lease ownership was lost",
      );
    }
  } catch (error: unknown) {
    const now = new Date();
    const errorName = getSafeErrorName(error);

    try {
      if (
        notification.delivery.attempts >=
        DELIVERY_CONFIG.MAX_ATTEMPTS
      ) {
        const updated = await deadLetterNotification(
          notificationId,
          leaseToken,
          errorName,
          now,
        );

        if (updated) {
          logger.error(
            {
              notificationId: notificationId.toHexString(),
              attempts: notification.delivery.attempts,
              errorName,
            },
            "Notification delivery moved to dead-letter",
          );
        }
      } else {
        const delay = calculateRetryDelay(
          notification.delivery.attempts,
        );

        const nextAttemptAt = new Date(
          now.getTime() + delay,
        );

        const updated = await retryNotificationDelivery(
          notificationId,
          leaseToken,
          nextAttemptAt,
          errorName,
          now,
        );

        if (updated) {
          logger.warn(
            {
              notificationId: notificationId.toHexString(),
              nextAttemptAt,
              errorName,
            },
            "Notification delivery scheduled for retry",
          );
        }
      }
    } catch (recoveryError: unknown) {
      logger.error(
        {
          notificationId: notificationId.toHexString(),
          errorName: getSafeErrorName(recoveryError),
        },
        "Failed to persist notification delivery recovery state",
      );
    }

    throw error;
  }
}

export async function processPendingNotifications(): Promise<number> {
  const now = new Date();

  const deadLettered = await deadLetterExhaustedNotifications(
    DELIVERY_CONFIG.MAX_ATTEMPTS,
    now,
  );

  if (deadLettered > 0) {
    logger.error(
      { count: deadLettered },
      "Exhausted notification deliveries moved to dead-letter",
    );
  }

  let processedCount = 0;

  for (let index = 0; index < 10; index += 1) {
    const claimTime = new Date();

    const notification = await claimNextNotification(
      claimTime,
      DELIVERY_CONFIG.LEASE_DURATION_MS,
      DELIVERY_CONFIG.MAX_ATTEMPTS,
    );

    if (!notification) {
      break;
    }

    processedCount += 1;

    try {
      await deliverClaimedNotification(notification);
    } catch {
      // Recovery state is handled by deliverClaimedNotification.
      // Continue processing the remaining notifications.
    }
  }

  return processedCount;
}


export async function processNotificationById(
  notificationId: ObjectId,
): Promise<boolean> {
  const now = new Date();

  const claimedNotification =
    await claimNotificationById(
      notificationId,
      now,
      new Date(now.getTime() + DELIVERY_CONFIG.LEASE_DURATION_MS),
      DELIVERY_CONFIG.MAX_ATTEMPTS,
    );

  if (!claimedNotification) {
    return false;
  }

  await deliverClaimedNotification(claimedNotification);

  return true;
}
