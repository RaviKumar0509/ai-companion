import { Router, type Router as ExpressRouter } from "express";

import {
  createAnonymousIdentityController,
} from "../controllers/anonymous.controller.js";

import {
  authenticateAnonymousIdentityController,
} from "../controllers/anonymous-authentication.controller.js";

import { validateBody } from "../../../shared/middleware/validation.middleware.js";

import {
  anonymousAuthenticationSchema,
  createAnonymousIdentitySchema,
} from "../schemas/identity.schemas.js";

const router: ExpressRouter = Router();

router.post(
  "/anonymous",
  validateBody(createAnonymousIdentitySchema),
  createAnonymousIdentityController,
);

router.post(
  "/anonymous/authenticate",
  validateBody(anonymousAuthenticationSchema),
  authenticateAnonymousIdentityController,
);

export default router;