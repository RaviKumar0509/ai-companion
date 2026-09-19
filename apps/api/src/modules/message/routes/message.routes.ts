import { Router, type Router as ExpressRouter } from "express";

import { authenticate } from "../../../shared/middleware/auth.middleware.js";
import { authenticateAnonymous } from "../../../shared/middleware/anonymous-auth.middleware.js";
import { validateBody } from "../../../shared/middleware/validation.middleware.js";

import {
  createMessageSchema,
} from "../schemas/message.schemas.js";

import {
  createAnonymousMessageController,
  createUserMessageController,
  listAnonymousMessagesController,
  listUserMessagesController,
} from "../controllers/message.controller.js";

const router: ExpressRouter = Router();

/*
 * Registered-user messages
 *
 * POST /api/v1/messages
 * GET  /api/v1/messages/conversation/:conversationId
 */
router.post(
  "/",
  authenticate,
  validateBody(createMessageSchema),
  createUserMessageController,
);

router.get(
  "/conversation/:conversationId",
  authenticate,
  listUserMessagesController,
);

/*
 * Anonymous messages
 *
 * POST /api/v1/messages/anonymous
 * GET  /api/v1/messages/anonymous/conversation/:conversationId
 */
router.post(
  "/anonymous",
  authenticateAnonymous,
  validateBody(createMessageSchema),
  createAnonymousMessageController,
);

router.get(
  "/anonymous/conversation/:conversationId",
  authenticateAnonymous,
  listAnonymousMessagesController,
);

export default router;