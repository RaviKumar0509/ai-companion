import { Router, type Router as ExpressRouter } from "express";

import {
  createAnonymousIdentityController,
} from "../controllers/anonymous.controller.js";

import {
  authenticateAnonymousIdentityController,
} from "../controllers/anonymous-authentication.controller.js";

import {
  anonymousMeController,
} from "../controllers/anonymous-me.controller.js";

import {
  anonymousLogoutController,
} from "../controllers/anonymous-logout.controller.js";

import {
  validateBody,
} from "../../../shared/middleware/validation.middleware.js";

import {
  anonymousAuthenticationRateLimiter,
  anonymousIdentityCreationRateLimiter,
} from "../../../config/rate-limit.js";

import {
  anonymousAuthenticationSchema,
  createAnonymousIdentitySchema,
} from "../schemas/identity.schemas.js";

import {
  authenticateAnonymous,
} from "../../../shared/middleware/anonymous-auth.middleware.js";

const router: ExpressRouter = Router();

router.post(
  "/anonymous",
  anonymousIdentityCreationRateLimiter,
  validateBody(createAnonymousIdentitySchema),
  createAnonymousIdentityController,
);

router.post(
  "/anonymous/authenticate",
  anonymousAuthenticationRateLimiter,
  validateBody(anonymousAuthenticationSchema),
  authenticateAnonymousIdentityController,
);

router.get(
  "/anonymous/me",
  authenticateAnonymous,
  anonymousMeController,
);

router.post(
  "/anonymous/logout",
  authenticateAnonymous,
  anonymousLogoutController,
);

export default router;