import type { RequestHandler } from "express";

import type {
  AnonymousAuthenticatedRequest,
} from "../../../shared/middleware/anonymous-auth.middleware.js";

import {
  revokeAnonymousIdentityForLogout,
} from "../services/anonymous-identity.service.js";

export const anonymousLogoutController: RequestHandler =
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

      await revokeAnonymousIdentityForLogout(anonymousId);

      res.status(200).json({
        success: true,
        message: "Anonymous identity logged out successfully.",
        requestId: res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };