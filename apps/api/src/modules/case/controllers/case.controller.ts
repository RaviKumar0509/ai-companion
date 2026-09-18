import type { RequestHandler } from "express";

import type { AuthenticatedRequest } from "../../../shared/middleware/auth.middleware.js";
import type { AnonymousAuthenticatedRequest } from "../../../shared/middleware/anonymous-auth.middleware.js";

import {
  createAnonymousCase,
  createUserCase,
  getCaseByIdForAnonymous,
  getCaseByIdForUser,
  listAnonymousCases,
  listUserCases,
  updateUserCase,
  updateAnonymousCase,
} from "../services/case.service.js";

import {
  UnauthorizedError,
  ValidationError,
} from "../../../shared/errors/index.js";

import type {
  CreateCaseInput,
  ListCasesQuery,
} from "../schemas/case.schemas.js";



import type {
  UpdateCaseInput,
} from "../schemas/case.schemas.js";

function serializeCase(caseDocument: {
  _id?: { toString(): string };
  ownerType: string;
  status: string;
  concernType?: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  archivedAt?: Date;
}) {
  return {
    id: caseDocument._id!.toString(),
    ownerType: caseDocument.ownerType,
    status: caseDocument.status,
    ...(caseDocument.concernType !== undefined && {
      concernType: caseDocument.concernType,
    }),
    ...(caseDocument.title !== undefined && {
      title: caseDocument.title,
    }),
    createdAt: caseDocument.createdAt,
    updatedAt: caseDocument.updatedAt,
    ...(caseDocument.closedAt !== undefined && {
      closedAt: caseDocument.closedAt,
    }),
    ...(caseDocument.archivedAt !== undefined && {
      archivedAt: caseDocument.archivedAt,
    }),
  };
}

export const createUserCaseController: RequestHandler =
  async (req, res, next) => {
    try {
      const authenticatedRequest =
        req as AuthenticatedRequest;

      const userId = authenticatedRequest.auth?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required.",
          },
          requestId: res.locals.requestId,
        });
        return;
      }

      const input = req.body as CreateCaseInput;

      const caseInput: {
        userId: string;
        concernType?: string;
        title?: string;
      } = {
        userId,
      };

      if (input.concernType !== undefined) {
        caseInput.concernType = input.concernType;
      }

      if (input.title !== undefined) {
        caseInput.title = input.title;
      }

      const caseDocument = await createUserCase(caseInput);

      res.status(201).json({
        success: true,
        message: "Case created successfully.",
        data: serializeCase(caseDocument),
        requestId: res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };

export const createAnonymousCaseController: RequestHandler =
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

      const input = req.body as CreateCaseInput;

      const caseInput: {
        anonymousId: string;
        concernType?: string;
        title?: string;
      } = {
        anonymousId,
      };

      if (input.concernType !== undefined) {
        caseInput.concernType = input.concernType;
      }

      if (input.title !== undefined) {
        caseInput.title = input.title;
      }

      const caseDocument =
        await createAnonymousCase(caseInput);

      res.status(201).json({
        success: true,
        message: "Anonymous case created successfully.",
        data: serializeCase(caseDocument),
        requestId: res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };

export const getUserCaseController: RequestHandler =
  async (req, res, next) => {
    try {
      const authenticatedRequest =
        req as AuthenticatedRequest;

      const userId = authenticatedRequest.auth?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required.",
          },
          requestId: res.locals.requestId,
        });
        return;
      }

      const caseId = req.params.caseId;

if (typeof caseId !== "string") {
  throw new ValidationError("Invalid case ID.");
}

      if (typeof caseId !== "string") {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid case ID.",
          },
          requestId: res.locals.requestId,
        });
        return;
      }

      const caseDocument = await getCaseByIdForUser(
        caseId,
        userId,
      );

      res.status(200).json({
        success: true,
        message: "Case retrieved successfully.",
        data: serializeCase(caseDocument),
        requestId: res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };

export const getAnonymousCaseController: RequestHandler =
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

   const caseId = req.params.caseId;

if (typeof caseId !== "string") {
  throw new ValidationError("Invalid case ID.");
}

      if (typeof caseId !== "string") {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid case ID.",
          },
          requestId: res.locals.requestId,
        });
        return;
      }

      const caseDocument =
        await getCaseByIdForAnonymous(
          caseId,
          anonymousId,
        );

      res.status(200).json({
        success: true,
        message: "Anonymous case retrieved successfully.",
        data: serializeCase(caseDocument),
        requestId: res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };

export const listUserCasesController: RequestHandler =
  async (req, res, next) => {
    try {
      const authenticatedRequest =
        req as AuthenticatedRequest;

      const userId = authenticatedRequest.auth?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required.",
          },
          requestId: res.locals.requestId,
        });
        return;
      }

      const rawQuery = req.query as unknown as ListCasesQuery;

const options: {
  limit: number;
  skip: number;
  status?: "active" | "closed" | "archived";
} = {
  limit: rawQuery.limit,
  skip: rawQuery.skip,
};

if (rawQuery.status !== undefined) {
  options.status = rawQuery.status;
}

      const cases = await listUserCases(
        userId,
        options,
      );

      res.status(200).json({
        success: true,
        message: "Cases retrieved successfully.",
        data: cases.map(serializeCase),
        requestId: res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };

  export const updateUserCaseController: RequestHandler =
  async (req, res, next) => {
    try {
      const userRequest =
        req as AuthenticatedRequest;

      const userId =
        userRequest.auth?.userId;

      if (!userId) {
        throw new UnauthorizedError(
          "Authentication required.",
        );
      }

   const caseId = req.params.caseId;

if (typeof caseId !== "string") {
  throw new ValidationError("Invalid case ID.");
}

      const input =
        req.body as UpdateCaseInput;

      const caseDocument =
        await updateUserCase(
          caseId,
          userId,
          input,
        );

      res.status(200).json({
        success: true,
        message: "Case updated successfully.",
        data: serializeCase(caseDocument),
        requestId: res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };

export const updateAnonymousCaseController: RequestHandler =
  async (req, res, next) => {
    try {
      const anonymousRequest =
        req as AnonymousAuthenticatedRequest;

      const anonymousId =
        anonymousRequest.anonymousAuth?.anonymousId;

      if (!anonymousId) {
        throw new UnauthorizedError(
          "Anonymous authentication required.",
        );
      }

      const caseId = req.params.caseId;

if (typeof caseId !== "string") {
  throw new ValidationError("Invalid case ID.");
}

      const input =
        req.body as UpdateCaseInput;

      const caseDocument =
        await updateAnonymousCase(
          caseId,
          anonymousId,
          input,
        );

      res.status(200).json({
        success: true,
        message: "Anonymous case updated successfully.",
        data: serializeCase(caseDocument),
        requestId: res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };

export const listAnonymousCasesController: RequestHandler =
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

      const rawQuery = req.query as unknown as ListCasesQuery;

const options: {
  limit: number;
  skip: number;
  status?: "active" | "closed" | "archived";
} = {
  limit: rawQuery.limit,
  skip: rawQuery.skip,
};

if (rawQuery.status !== undefined) {
  options.status = rawQuery.status;
}
      const cases = await listAnonymousCases(
        anonymousId,
        options,
      );

      res.status(200).json({
        success: true,
        message: "Anonymous cases retrieved successfully.",
        data: cases.map(serializeCase),
        requestId: res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };

  