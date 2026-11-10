
import type { Server } from "node:http";

import { logger } from "../infrastructure/logger/logger.js";

import {
  connectDatabase,
  ensureIndexes,
  mongoClient,
  setDatabase,
} from "../infrastructure/database/index.js";

import { startServer } from "../server.js";

import {
  startEscalationRecoveryWorker,
} from "../modules/safety/workers/escalation-recovery.worker.js";

import {
  startNotificationDeliveryWorker,
} from "../modules/notification/workers/notification-delivery.worker.js";

let server: Server | null = null;

let escalationRecoveryWorker:
  | ReturnType<typeof startEscalationRecoveryWorker>
  | null = null;

let notificationDeliveryWorker:
  | ReturnType<typeof startNotificationDeliveryWorker>
  | null = null;

let isShuttingDown = false;

async function bootstrap(): Promise<void> {
  logger.info(
    "========================================",
  );

  logger.info(
    "AI Companion Platform API bootstrap started",
  );

  logger.info(
    "1. Connecting database...",
  );

  const database = await connectDatabase();

  setDatabase(database);

  logger.info(
    "2. Database connected successfully",
  );

  await ensureIndexes();

  logger.info(
    "3. Starting HTTP server...",
  );

  server = startServer();

  logger.info(
    "4. Starting escalation recovery worker...",
  );

  escalationRecoveryWorker =
    startEscalationRecoveryWorker();

  logger.info(
    "5. Starting notification delivery worker...",
  );

  notificationDeliveryWorker =
    startNotificationDeliveryWorker();

  logger.info(
    "6. Application startup completed",
  );
}

async function shutdown(
  signal: string,
): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  logger.info(
    { signal },
    "Shutdown signal received",
  );

  try {
    // 1. Stop escalation recovery worker.
    if (escalationRecoveryWorker) {
      logger.info(
        "Stopping escalation recovery worker...",
      );

      await escalationRecoveryWorker.stop();

      escalationRecoveryWorker = null;

      logger.info(
        "Escalation recovery worker stopped",
      );
    }

    // 2. Stop notification delivery worker.
    if (notificationDeliveryWorker) {
      logger.info(
        "Stopping notification delivery worker...",
      );

      await notificationDeliveryWorker.stop();

      notificationDeliveryWorker = null;

      logger.info(
        "Notification delivery worker stopped",
      );
    }

    // 3. Close HTTP server.
    if (server) {
      logger.info(
        "Closing HTTP server...",
      );

      await new Promise<void>(
        (resolve, reject) => {
          server?.close((error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        },
      );

      server = null;

      logger.info(
        "HTTP server closed",
      );
    }

    // 4. Close MongoDB after background processing stops.
    logger.info(
      "Closing MongoDB connection...",
    );

    await mongoClient.close();

    logger.info(
      "MongoDB connection closed",
    );

    logger.info(
      "Application shutdown completed",
    );

    process.exit(0);
  } catch (error: unknown) {
    logger.fatal(
      {
        errorName:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
      "Application shutdown failed",
    );

    process.exit(1);
  }
}

process.on(
  "SIGINT",
  () => {
    void shutdown("SIGINT");
  },
);

process.on(
  "SIGTERM",
  () => {
    void shutdown("SIGTERM");
  },
);

bootstrap().catch(
  (error: unknown) => {
    logger.fatal(
      {
        errorName:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
      "Application bootstrap failed",
    );

    process.exit(1);
  },
);
