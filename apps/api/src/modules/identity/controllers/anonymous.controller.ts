import type { RequestHandler } from "express";

import type {
  CreateAnonymousIdentityInput,
} from "../schemas/identity.schemas.js";

import {
  createAnonymousIdentityForDevice,
} from "../services/anonymous-identity.service.js";

export const createAnonymousIdentityController: RequestHandler =
  async (req, res, next) => {
    try {
      const input = req.body as CreateAnonymousIdentityInput;

      const result = await createAnonymousIdentityForDevice(
        input.deviceId,
      );

      const { identity, anonymousSecret } = result;

      res.status(201).json({
        success: true,
        message: "Anonymous identity created successfully.",
        data: {
          anonymousId: identity.anonymousId,
          anonymousSecret,
          expiresAt: identity.expiresAt,
        },
        requestId: res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };