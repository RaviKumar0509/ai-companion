import express, {
  type Express,
} from "express";

import helmet from "helmet";

import {
  corsMiddleware,
} from "./config/cors.js";

import {
  globalRateLimiter,
} from "./config/rate-limit.js";

import {
  NotFoundError,
} from "./shared/errors/index.js";

import {
  errorHandler,
} from "./shared/middleware/error-handler.middleware.js";

import {
  requestIdMiddleware,
} from "./shared/middleware/request-id.middleware.js";

import {
  requestLoggingMiddleware,
} from "./shared/middleware/request-logging.middleware.js";

import authRoutes from "./modules/auth/routes/auth.routes.js";
import identityRoutes from "./modules/identity/routes/identity.routes.js";
import caseRoutes from "./modules/case/routes/case.routes.js";
import conversationRoutes from "./modules/conversation/routes/conversation.routes.js";
import messageRoutes from "./modules/message/routes/message.routes.js";
import { safetyRouter } from "./modules/safety/routes/safety.routes.js";

import {
  env,
} from "./config/env.js";

export function createApp(): Express {
  const app = express();

  app.set(
  "trust proxy",
  env.TRUST_PROXY,
);

  /*
   * --------------------------------------------------
   * SECURITY HEADERS
   * --------------------------------------------------
   */

  app.use(helmet());

  /*
   * --------------------------------------------------
   * CORS
   * --------------------------------------------------
   */

  app.use(corsMiddleware);

  /*
   * --------------------------------------------------
   * REQUEST ID
   *
   * Every request receives one unique ID.
   * This allows us to trace a request across
   * logs, errors and responses.
   * --------------------------------------------------
   */

  app.use(requestIdMiddleware);

  /*
   * --------------------------------------------------
   * REQUEST LOGGING
   *
   * Register this before rate limiting so even
   * rejected requests can be observed.
   * --------------------------------------------------
   */

  app.use(requestLoggingMiddleware);

  /*
   * --------------------------------------------------
   * GLOBAL RATE LIMIT
   * --------------------------------------------------
   */

  app.use(globalRateLimiter);

  /*
   * --------------------------------------------------
   * JSON BODY PARSER
   *
   * Reject excessively large JSON requests.
   * --------------------------------------------------
   */

  app.use(
    express.json({
      limit: "1mb",
    }),
  );

  /*
   * --------------------------------------------------
   * HEALTH CHECK
   * --------------------------------------------------
   */

  app.get("/health", (_req, res) => {
    res.status(200).json({
      success: true,
      message: "AI Companion API is healthy.",
      requestId: res.locals.requestId,
    });
  });

  app.use(
  "/api/v1/auth",
  authRoutes,
);

app.use("/api/v1/identity", identityRoutes);
app.use("/api/v1/cases", caseRoutes);
app.use("/api/v1/conversations", conversationRoutes);
app.use(  "/api/v1/messages",  messageRoutes,);
app.use("/api/v1/safety", safetyRouter);

  /*
   * --------------------------------------------------
   * 404 HANDLER
   *
   * If no route matches the request,
   * convert it into our standard application error.
   * --------------------------------------------------
   */

  app.use((req) => {
    throw new NotFoundError(
      `Route ${req.method} ${req.originalUrl} not found.`,
    );
  });

  /*
   * --------------------------------------------------
   * GLOBAL ERROR HANDLER
   *
   * IMPORTANT:
   * This must always be registered after
   * routes and other middleware.
   * --------------------------------------------------
   */

  app.use(errorHandler);

  return app;
}