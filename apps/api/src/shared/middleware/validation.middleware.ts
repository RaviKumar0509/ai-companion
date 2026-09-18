import type {
  Request,
  RequestHandler,
} from "express";

import {
  z,
} from "zod";

import {
  ValidationError,
} from "../errors/index.js";

export function validateBody(
  schema: z.ZodType,
): RequestHandler {
  return (req, _res, next) => {
    const result =
      schema.safeParse(req.body);

    if (!result.success) {
      const issues =
        result.error.issues.map(
          (issue) => ({
            path: issue.path,
            message: issue.message,
            code: issue.code,
          }),
        );

      const error =
        new ValidationError(
          "Request validation failed.",
        );

      /*
       * Attach structured validation
       * information for the global error
       * handler.
       */
      Object.assign(error, {
        details: issues,
      });

      next(error);
      return;
    }

    /*
     * Store the validated/transformed
     * value back on the request.
     *
     * This is important because our Zod
     * schemas can normalize values.
     */
    req.body = result.data;

    next();
  };
}

export function validateQuery<T extends z.ZodType>(
  schema: T,
): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      next(
        new ValidationError(
          "Invalid query parameters.",
        ),
      );
      return;
    }

    Object.assign(req.query, result.data);

    next();
  };
}