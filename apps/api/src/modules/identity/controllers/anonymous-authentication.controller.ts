import type { RequestHandler } from "express";

import type {
  AnonymousAuthenticationInput,
} from "../schemas/identity.schemas.js";

import {
  authenticateAnonymousIdentity,
} from "../services/anonymous-identity.service.js";

import { UnauthorizedError } from "../../../shared/errors/index.js";

export const authenticateAnonymousIdentityController: RequestHandler =
  async (req, res, next) => {
    try {
      const input = req.body as AnonymousAuthenticationInput;

      const identity = await authenticateAnonymousIdentity(
        input.anonymousId,
        input.anonymousSecret,
      );

      if (!identity) {
        throw new UnauthorizedError(
          "Invalid anonymous authentication credentials.",
        );
      }

      res.status(200).json({
        success: true,
        message: "Anonymous identity authenticated successfully.",
        data: {
          anonymousId: identity.anonymousId,
          expiresAt: identity.expiresAt,
        },
        requestId: res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };