import type { Server } from "node:http";

import { logger } from "../infrastructure/logger/logger.js";

import {
  connectDatabase,
  ensureIndexes,
  mongoClient,
  setDatabase,
} from "../infrastructure/database/index.js";

import { startServer } from "../server.js";

let server: Server | null = null;

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

  const database =
    await connectDatabase();

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
    "4. Application startup completed",
  );
}

async function shutdown(
  signal: string,
): Promise<void> {
  logger.info(
    { signal },
    "Shutdown signal received",
  );

  try {
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

      logger.info(
        "HTTP server closed",
      );
    }

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
        error,
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
        error,
      },
      "❌ Application bootstrap failed",
    );

    process.exit(1);
  },
);