
import type {
  NextFunction,
  Response,
} from "express";

import {
  UnauthorizedError,
  ValidationError,
} from "../../../shared/errors/index.js";

import type {
  AuthenticatedRequest,
} from "../../../shared/middleware/auth.middleware.js";

import type {
  ListEscalationsQuery,
} from "../schemas/clinician.schemas.js";

import {
  getClinicianEscalation,
  listClinicianEscalations,
} from "../services/clinician.service.js";

export async function listClinicianEscalationsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (
      !req.auth?.userId ||
      !req.auth.role
    ) {
      throw new UnauthorizedError(
        "Authentication and authorization required.",
      );
    }

    const query =
      res.locals.validatedQuery as ListEscalationsQuery;

    const result = await listClinicianEscalations({
      userId: req.auth.userId,
      role: req.auth.role,
      page: query.page,
      limit: query.limit,
      ...(query.status !== undefined
        ? { status: query.status }
        : {}),
    });

    res.status(200).json({
      success: true,
      data: result,
      requestId: res.locals.requestId,
    });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getClinicianEscalationController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (
      !req.auth?.userId ||
      !req.auth.role
    ) {
      throw new UnauthorizedError(
        "Authentication and authorization required.",
      );
    }

    const escalationId = req.params.id;

    if (typeof escalationId !== "string" || !escalationId) {
      throw new ValidationError(
        "A valid escalation ID is required.",
      );
    }

    const result = await getClinicianEscalation({
      escalationId,
      userId: req.auth.userId,
      role: req.auth.role,
    });

    res.status(200).json({
      success: true,
      data: result,
      requestId: res.locals.requestId,
    });
  } catch (error: unknown) {
    next(error);
  }
}
