
import { logger } from "../../../infrastructure/logger/logger.js";

import {
  processPendingNotifications,
} from "../services/notification-delivery.service.js";

const WORKER_CONFIG = {
  POLLING_INTERVAL_MS: 5_000,
} as const;

let pollingTimer: ReturnType<typeof setInterval> | null = null;
let activeRun: Promise<void> | null = null;
let stopped = true;

async function runDeliveryCycle(): Promise<void> {
  if (stopped || activeRun) {
    return;
  }

  activeRun = (async () => {
    try {
      const processedCount =
        await processPendingNotifications();

      if (processedCount > 0) {
        logger.info(
          {
            processedCount,
            worker: "notification-delivery",
          },
          "Notification delivery cycle completed",
        );
      }
    } catch (error: unknown) {
      logger.error(
        {
          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
          worker: "notification-delivery",
        },
        "Notification delivery cycle failed",
      );
    }
  })();

  try {
    await activeRun;
  } finally {
    activeRun = null;
  }
}

export function startNotificationDeliveryWorker(): {
  stop: () => Promise<void>;
} {
  if (!stopped) {
    throw new Error(
      "Notification delivery worker is already running.",
    );
  }

  stopped = false;

  logger.info(
    {
      pollingIntervalMs:
        WORKER_CONFIG.POLLING_INTERVAL_MS,
      worker: "notification-delivery",
    },
    "Starting notification delivery worker",
  );

  void runDeliveryCycle();

  pollingTimer = setInterval(
    () => void runDeliveryCycle(),
    WORKER_CONFIG.POLLING_INTERVAL_MS,
  );

  return {
    stop: async (): Promise<void> => {
      if (stopped) {
        return;
      }

      stopped = true;

      if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
      }

      if (activeRun) {
        await activeRun;
      }

      logger.info(
        {
          worker: "notification-delivery",
        },
        "Notification delivery worker stopped",
      );
    },
  };
}
