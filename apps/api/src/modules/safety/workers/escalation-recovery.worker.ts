
import { logger } from "../../../infrastructure/logger/logger.js";

import {
  processPendingSafetyEscalations,
} from "../services/escalation.service.js";

const WORKER_CONFIG = {
  POLLING_INTERVAL_MS: 5_000,
} as const;

let pollingTimer: ReturnType<typeof setInterval> | null = null;
let activeRun: Promise<void> | null = null;
let stopped = true;

async function runRecoveryCycle(): Promise<void> {
  if (stopped || activeRun) {
    return;
  }

  activeRun = (async () => {
    try {
      const processedCount =
        await processPendingSafetyEscalations();

      if (processedCount > 0) {
        logger.info(
          {
            processedCount,
            worker: "escalation-recovery",
          },
          "Escalation recovery batch completed",
        );
      }
    } catch (error: unknown) {
      logger.error(
        {
          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
          worker: "escalation-recovery",
        },
        "Escalation recovery worker cycle failed",
      );
    }
  })();

  try {
    await activeRun;
  } finally {
    activeRun = null;
  }
}

export function startEscalationRecoveryWorker(): {
  stop: () => Promise<void>;
} {
  if (!stopped) {
    throw new Error(
      "Escalation recovery worker is already running.",
    );
  }

  stopped = false;

  logger.info(
    {
      pollingIntervalMs: WORKER_CONFIG.POLLING_INTERVAL_MS,
      worker: "escalation-recovery",
    },
    "Starting escalation recovery worker",
  );

  // Start the first recovery cycle immediately.
  void runRecoveryCycle();

  pollingTimer = setInterval(() => {
    void runRecoveryCycle();
  }, WORKER_CONFIG.POLLING_INTERVAL_MS);

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

      // Allow the currently running recovery cycle to finish.
      if (activeRun) {
        await activeRun;
      }

      logger.info(
        {
          worker: "escalation-recovery",
        },
        "Escalation recovery worker stopped",
      );
    },
  };
}
