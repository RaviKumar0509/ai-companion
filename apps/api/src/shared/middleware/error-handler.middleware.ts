import type {
  ErrorRequestHandler,
} from "express";

import { AppError } from "../errors/index.js";

import {
  logger,
} from "../../infrastructure/logger/logger.js";

interface ExpressRequestError extends Error {
  type?: string;
  status?: number;
  statusCode?: number;
  body?: unknown;
  expose?: boolean;
}

export const errorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  _next,
) => {
  const requestId =
    res.locals.requestId ?? "unknown";

  /*
   * Application errors
   */
  if (error instanceof AppError) {
    logger.warn(
      {
        requestId,
        statusCode: error.statusCode,
        code: error.code,
        path: req.originalUrl,
        method: req.method,
      },
      error.message,
    );

    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      requestId,
    });

    return;
  }

  /*
   * Express body-parser errors
   *
   * Example:
   * entity.too.large
   */
  const requestError =
    error as ExpressRequestError;

  if (
    requestError.type ===
    "entity.too.large"
  ) {
    logger.warn(
      {
        requestId,
        statusCode: 413,
        code: "PAYLOAD_TOO_LARGE",
        path: req.originalUrl,
        method: req.method,
      },
      "Request payload too large.",
    );

    res.status(413).json({
      success: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message:
          "Request payload is too large.",
      },
      requestId,
    });

    return;
  }

  /*
   * Malformed JSON
   *
   * Example:
   * POST /api/v1/example
   *
   * {
   *   "name": "Ravi"
   *   <-- missing comma / closing syntax
   */
  if (
    requestError.type ===
    "entity.parse.failed"
  ) {
    logger.warn(
      {
        requestId,
        statusCode: 400,
        code: "INVALID_JSON",
        path: req.originalUrl,
        method: req.method,
      },
      "Invalid JSON request body.",
    );

    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_JSON",
        message:
          "Request body contains invalid JSON.",
      },
      requestId,
    });

    return;
  }

  /*
   * Unknown / unexpected errors
   */
  logger.error(
    {
      error,
      requestId,
      path: req.originalUrl,
      method: req.method,
    },
    "Unhandled application error",
  );

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        "An unexpected error occurred.",
    },
    requestId,
  });
};