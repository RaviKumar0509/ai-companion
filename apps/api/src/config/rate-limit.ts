import {
  rateLimit,
} from "express-rate-limit";

export const globalRateLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,

    limit: 300,

    standardHeaders: "draft-8",

    legacyHeaders: false,

    handler: (_req, res) => {
      const requestId =
        res.locals.requestId ?? "unknown";

      res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message:
            "Too many requests. Please try again later.",
        },
        requestId,
      });
    },
  });