import type {
  RequestHandler,
} from "express";

import {
  logger,
} from "../../infrastructure/logger/logger.js";

export const requestLoggingMiddleware: RequestHandler = (
  req,
  res,
  next,
) => {
  const requestId =
    res.locals.requestId ?? "unknown";

  const startedAt = process.hrtime.bigint();

  logger.info(
    {
      requestId,
      method: req.method,
      path: req.originalUrl,
    },
    "HTTP request started",
  );

  res.on("finish", () => {
    const endedAt =
      process.hrtime.bigint();

    const durationMs =
      Number(endedAt - startedAt) / 1_000_000;

    logger.info(
      {
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Number(
          durationMs.toFixed(2),
        ),
      },
      "HTTP request completed",
    );
  });

  next();
};