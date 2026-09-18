import { Router, type Router as ExpressRouter } from "express";

import { authenticate } from "../../../shared/middleware/auth.middleware.js";
import { authenticateAnonymous } from "../../../shared/middleware/anonymous-auth.middleware.js";
import { validateBody } from "../../../shared/middleware/validation.middleware.js";
import {
  createConversationSchema,
} from "../schemas/conversation.schemas.js";
import {
  closeAnonymousConversationController,
  closeUserConversationController,
  createAnonymousConversationController,
  createUserConversationController,
  getAnonymousConversationController,
  getUserConversationController,
  listAnonymousConversationsController,
  listUserConversationsController,
} from "../controllers/conversation.controller.js";

const router: ExpressRouter = Router();

/*
 * Registered-user conversations
 *
 * POST   /api/v1/conversations
 * GET    /api/v1/conversations/case/:caseId
 * GET    /api/v1/conversations/:conversationId
 * POST   /api/v1/conversations/:conversationId/close
 */
router.post(
  "/",
  authenticate,
  validateBody(createConversationSchema),
  createUserConversationController,
);

router.get(
  "/case/:caseId",
  authenticate,
  listUserConversationsController,
);

router.get(
  "/:conversationId",
  authenticate,
  getUserConversationController,
);

router.post(
  "/:conversationId/close",
  authenticate,
  closeUserConversationController,
);

/*
 * Anonymous conversations
 *
 * POST   /api/v1/conversations/anonymous
 * GET    /api/v1/conversations/anonymous/case/:caseId
 * GET    /api/v1/conversations/anonymous/:conversationId
 * POST   /api/v1/conversations/anonymous/:conversationId/close
 */
router.post(
  "/anonymous",
  authenticateAnonymous,
  validateBody(createConversationSchema),
  createAnonymousConversationController,
);

router.get(
  "/anonymous/case/:caseId",
  authenticateAnonymous,
  listAnonymousConversationsController,
);

router.get(
  "/anonymous/:conversationId",
  authenticateAnonymous,
  getAnonymousConversationController,
);

router.post(
  "/anonymous/:conversationId/close",
  authenticateAnonymous,
  closeAnonymousConversationController,
);

export default router;