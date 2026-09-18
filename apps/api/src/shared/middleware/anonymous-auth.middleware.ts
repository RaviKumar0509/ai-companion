import type { NextFunction, Request, Response } from "express";

import { UnauthorizedError } from "../errors/index.js";

import {
  authenticateAnonymousIdentity,
} from "../../modules/identity/services/anonymous-identity.service.js";

import {
  verifyAnonymousAccessToken,
} from "../../modules/identity/services/anonymous-token.service.js";

import {
  findAnonymousIdentityById,
} from "../../modules/identity/repositories/anonymous-identity.repository.js";

import {
  ANONYMOUS_IDENTITY_STATUS,
} from "../../modules/identity/types/anonymous-identity.types.js";

export interface AnonymousAuthenticatedRequest extends Request {
  anonymousAuth?: {
    anonymousId: string;
  };
}

export async function authenticateAnonymous(
  req: AnonymousAuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedError(
        "Anonymous authentication required.",
      );
    }

    /*
     * Preferred authentication mechanism:
     *
     * Authorization: AnonymousBearer <accessToken>
     */
    if (authorization.startsWith("AnonymousBearer ")) {
      await authenticateWithAccessToken(req, authorization);
      next();
      return;
    }

    /*
     * Backward-compatible authentication mechanism:
     *
     * Authorization: Anonymous <anonymousId>.<anonymousSecret>
     */
    if (authorization.startsWith("Anonymous ")) {
      await authenticateWithAnonymousSecret(req, authorization);
      next();
      return;
    }

    throw new UnauthorizedError(
      "Invalid anonymous authentication credentials.",
    );
  } catch (error: unknown) {
    /*
     * Authentication failures must never become 500 responses.
     *
     * In particular, jose.jwtVerify() throws JWT-specific errors
     * for malformed, expired, incorrectly signed, or otherwise
     * invalid tokens.
     */
    if (error instanceof UnauthorizedError) {
      next(error);
      return;
    }

    next(
      new UnauthorizedError(
        "Invalid anonymous authentication credentials.",
      ),
    );
  }
}

async function authenticateWithAccessToken(
  req: AnonymousAuthenticatedRequest,
  authorization: string,
): Promise<void> {
  const accessToken = authorization
    .slice("AnonymousBearer ".length)
    .trim();

  if (!accessToken) {
    throw new UnauthorizedError(
      "Invalid anonymous authentication credentials.",
    );
  }

  let payload;

  try {
    payload = await verifyAnonymousAccessToken(accessToken);
  } catch {
    throw new UnauthorizedError(
      "Invalid anonymous authentication credentials.",
    );
  }

  const anonymousId = payload.sub;

  if (!anonymousId) {
    throw new UnauthorizedError(
      "Invalid anonymous authentication credentials.",
    );
  }

  /*
   * JWT validation alone is not sufficient.
   *
   * The anonymous identity may have been revoked after the JWT
   * was issued. Therefore we always check the current identity
   * state in MongoDB.
   */
  const identity = await findAnonymousIdentityById(anonymousId);

  if (!identity) {
    throw new UnauthorizedError(
      "Invalid anonymous authentication credentials.",
    );
  }

  const now = new Date();

  if (
    identity.status !== ANONYMOUS_IDENTITY_STATUS.ACTIVE ||
    identity.expiresAt.getTime() <= now.getTime()
  ) {
    throw new UnauthorizedError(
      "Invalid anonymous authentication credentials.",
    );
  }

  req.anonymousAuth = {
    anonymousId: identity.anonymousId,
  };
}

async function authenticateWithAnonymousSecret(
  req: AnonymousAuthenticatedRequest,
  authorization: string,
): Promise<void> {
  const credentials = authorization
    .slice("Anonymous ".length)
    .trim();

  if (!credentials) {
    throw new UnauthorizedError(
      "Anonymous authentication required.",
    );
  }

  const separatorIndex = credentials.indexOf(".");

  if (separatorIndex <= 0) {
    throw new UnauthorizedError(
      "Invalid anonymous authentication credentials.",
    );
  }

  const anonymousId = credentials.slice(0, separatorIndex);
  const anonymousSecret = credentials.slice(separatorIndex + 1);

  if (!anonymousSecret) {
    throw new UnauthorizedError(
      "Invalid anonymous authentication credentials.",
    );
  }

  const identity = await authenticateAnonymousIdentity(
    anonymousId,
    anonymousSecret,
  );

  if (!identity) {
    throw new UnauthorizedError(
      "Invalid anonymous authentication credentials.",
    );
  }

  req.anonymousAuth = {
    anonymousId: identity.anonymousId,
  };
}