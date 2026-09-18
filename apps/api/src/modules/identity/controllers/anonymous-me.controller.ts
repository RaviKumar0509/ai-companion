import type { RequestHandler } from "express";

import type { AnonymousAuthenticatedRequest } from "../../../shared/middleware/anonymous-auth.middleware.js";

import { findAnonymousIdentityById } from "../repositories/anonymous-identity.repository.js";

export const anonymousMeController: RequestHandler =
  async (req, res, next) => {
    try {
      const anonymousRequest =
        req as AnonymousAuthenticatedRequest;

      const anonymousId =
        anonymousRequest.anonymousAuth?.anonymousId;

      if (!anonymousId) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Anonymous authentication required.",
          },
          requestId: res.locals.requestId,
        });
        return;
      }

      const identity =
        await findAnonymousIdentityById(anonymousId);

      if (!identity) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid anonymous authentication credentials.",
          },
          requestId: res.locals.requestId,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Anonymous identity retrieved successfully.",
        data: {
          anonymousId: identity.anonymousId,
          status: identity.status,
          expiresAt: identity.expiresAt,
        },
        requestId: res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };