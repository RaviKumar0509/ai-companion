
import {
  Router,
  type Router as ExpressRouter,
} from "express";

import {
  authenticate,
} from "../../../shared/middleware/auth.middleware.js";

import {
  requireRole,
} from "../../../shared/middleware/role.middleware.js";

import {
  validateQuery,
} from "../../../shared/middleware/validation.middleware.js";

import {
  USER_ROLE,
} from "../../auth/types/user.types.js";

import {
  getClinicianEscalationController,
} from "../controllers/clinician.controller.js";

import {
  listEscalationsQuerySchema,
} from "../schemas/clinician.schemas.js";

import {
  listClinicianEscalationsController,
} from "../controllers/clinician.controller.js";

const router: ExpressRouter = Router();

router.get(
  "/escalations",
  authenticate,
  requireRole(
    USER_ROLE.CLINICIAN,
    USER_ROLE.ADMIN,
    USER_ROLE.SUPER_ADMIN,
  ),
  validateQuery(listEscalationsQuerySchema),
  listClinicianEscalationsController,
);

router.get(
  "/escalations/:id",
  authenticate,
  requireRole(
    USER_ROLE.CLINICIAN,
    USER_ROLE.ADMIN,
    USER_ROLE.SUPER_ADMIN,
  ),
  getClinicianEscalationController,
);

export default router;
