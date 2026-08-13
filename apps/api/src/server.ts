import type { Server } from "node:http";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./infrastructure/logger/logger.js";

const app = createApp();

export function startServer(): Server {
  const server = app.listen(
    env.PORT,
    () => {
      logger.info(
        {
          port: env.PORT,
        },
        "AI Companion API server started",
      );
    },
  );

  return server;
}