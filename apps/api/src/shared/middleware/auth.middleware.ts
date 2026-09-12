import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { ObjectId } from "mongodb";

import {
  UnauthorizedError,
} from "../errors/index.js";

import {
  findSessionById,
} from "../../modules/auth/repositories/session.repository.js";

import {
  verifyAccessToken,
} from "../../modules/auth/services/token.service.js";

import {
  SESSION_STATUS,
} from "../../modules/auth/types/session.types.js";

export interface AuthenticatedRequest
  extends Request {
  auth?: {
    userId: string;
    sessionId: string;
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authorization =
      req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer ",
      )
    ) {
      throw new UnauthorizedError(
        "Authentication required.",
      );
    }

    const accessToken =
      authorization.slice(7).trim();

    if (!accessToken) {
      throw new UnauthorizedError(
        "Authentication required.",
      );
    }

    const payload =
      await verifyAccessToken(
        accessToken,
      );

    const userId =
      payload.sub;

    const sessionId =
      typeof payload.sid === "string"
        ? payload.sid
        : undefined;

    if (
      !userId ||
      !sessionId ||
      !ObjectId.isValid(userId)
    ) {
      throw new UnauthorizedError(
        "Invalid authentication credentials.",
      );
    }

    const session =
      await findSessionById(
        sessionId,
      );

    if (!session) {
      throw new UnauthorizedError(
        "Invalid authentication credentials.",
      );
    }

    if (
      session.status !==
      SESSION_STATUS.ACTIVE
    ) {
      throw new UnauthorizedError(
        "Authentication session is no longer active.",
      );
    }

    if (
      session.expiresAt.getTime() <=
      Date.now()
    ) {
      throw new UnauthorizedError(
        "Authentication session has expired.",
      );
    }

    if (
      session.userId.toString() !==
      userId
    ) {
      throw new UnauthorizedError(
        "Invalid authentication credentials.",
      );
    }

    req.auth = {
      userId,
      sessionId,
    };

    next();
  } catch (error) {
    next(error);
  }
}