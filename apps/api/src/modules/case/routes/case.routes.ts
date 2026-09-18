import { Router, type Router as ExpressRouter } from "express";

import {
  authenticate,
} from "../../../shared/middleware/auth.middleware.js";

import {
  authenticateAnonymous,
} from "../../../shared/middleware/anonymous-auth.middleware.js";



import {
  validateBody,
  validateQuery,
} from "../../../shared/middleware/validation.middleware.js";

import {
  createCaseSchema,
  listCasesQuerySchema,
  updateCaseSchema,
} from "../schemas/case.schemas.js";

import {
  createUserCaseController,
  createAnonymousCaseController,
  getUserCaseController,
  getAnonymousCaseController,
  listUserCasesController,
  listAnonymousCasesController,
  updateUserCaseController,
updateAnonymousCaseController,
} from "../controllers/case.controller.js";

const router: ExpressRouter = Router();

/*
 * Registered user case APIs
 */

router.post(
  "/",
  authenticate,
  validateBody(createCaseSchema),
  createUserCaseController,
);

router.get(
  "/",
  authenticate,
  validateQuery(listCasesQuerySchema),
  listUserCasesController,
);

router.get(
  "/:caseId",
  authenticate,
  getUserCaseController,
);

/*
 * Anonymous case APIs
 */

router.post(
  "/anonymous",
  authenticateAnonymous,
  validateBody(createCaseSchema),
  createAnonymousCaseController,
);

router.get(
  "/anonymous",
  authenticateAnonymous,
  validateQuery(listCasesQuerySchema),
  listAnonymousCasesController,
);

router.get(
  "/anonymous/:caseId",
  authenticateAnonymous,
  validateQuery(listCasesQuerySchema),
  getAnonymousCaseController,
);

router.patch(
  "/:caseId",
  authenticate,
  validateBody(updateCaseSchema),
  updateUserCaseController,
);

router.patch(
  "/anonymous/:caseId",
  authenticateAnonymous,
  validateBody(updateCaseSchema),
  updateAnonymousCaseController,
);

export default router;