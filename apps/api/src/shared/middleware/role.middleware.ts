
import type {
  NextFunction,
  Response,
} from "express";

import { ObjectId } from "mongodb";

import {
  ForbiddenError,
  UnauthorizedError,
} from "../errors/index.js";

import {
  findUserById,
} from "../../modules/auth/repositories/user.repository.js";

import {
  USER_STATUS,
} from "../../modules/auth/types/user.types.js";

import type {
  UserRole,
} from "../../modules/auth/types/user.types.js";

import type {
  AuthenticatedRequest,
} from "./auth.middleware.js";

export function requireRole(
  ...allowedRoles: UserRole[]
) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.auth?.userId) {
        throw new UnauthorizedError(
          "Authentication required.",
        );
      }

      if (!ObjectId.isValid(req.auth.userId)) {
        throw new UnauthorizedError(
          "Invalid authentication credentials.",
        );
      }

      const user = await findUserById(
        new ObjectId(req.auth.userId),
      );

      if (
        !user ||
        user.status !== USER_STATUS.ACTIVE
      ) {
        throw new UnauthorizedError(
          "Your account is not available.",
        );
      }

      if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenError(
          "You do not have permission to access this resource.",
        );
      }

      // Attach the role verified from MongoDB.
      req.auth = {
        ...req.auth,
        role: user.role,
      };

      next();
    } catch (error: unknown) {
      next(error);
    }
  };
}
