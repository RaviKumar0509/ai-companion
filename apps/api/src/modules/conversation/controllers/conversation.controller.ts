import type { Response } from "express";

import type { AuthenticatedRequest } from "../../../shared/middleware/auth.middleware.js";
import type { AnonymousAuthenticatedRequest } from "../../../shared/middleware/anonymous-auth.middleware.js";
import {
  closeAnonymousConversation,
  closeUserConversation,
  createAnonymousConversation,
  createUserConversation,
  getAnonymousConversation,
  getUserConversation,
  listAnonymousConversations,
  listUserConversations,
} from "../services/conversation.service.js";
import {
  caseIdParamSchema,
  conversationIdParamSchema,
  createConversationSchema,
  listConversationsQuerySchema,
} from "../schemas/conversation.schemas.js";
import type { ConversationDocument } from "../types/conversation.types.js";

export async function createUserConversationController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new Error("Authenticated user context is missing.");
  }

  const input = createConversationSchema.parse(req.body);

  const conversation = await createUserConversation(userId, input);

  res.status(201).json({
    success: true,
    message: "Conversation created successfully.",
    data: serializeConversation(conversation),
  });
}

export async function createAnonymousConversationController(
  req: AnonymousAuthenticatedRequest,
  res: Response,
): Promise<void> {
  const anonymousId = req.anonymousAuth?.anonymousId;

  if (!anonymousId) {
    throw new Error("Anonymous authentication context is missing.");
  }

  const input = createConversationSchema.parse(req.body);

  const conversation = await createAnonymousConversation(
    anonymousId,
    input,
  );

  res.status(201).json({
    success: true,
    message: "Conversation created successfully.",
    data: serializeConversation(conversation),
  });
}

export async function getUserConversationController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new Error("Authenticated user context is missing.");
  }

  const params = conversationIdParamSchema.parse(req.params);

  const conversation = await getUserConversation(
    userId,
    params.conversationId,
  );

  res.status(200).json({
    success: true,
    data: serializeConversation(conversation),
  });
}

export async function getAnonymousConversationController(
  req: AnonymousAuthenticatedRequest,
  res: Response,
): Promise<void> {
  const anonymousId = req.anonymousAuth?.anonymousId;

  if (!anonymousId) {
    throw new Error("Anonymous authentication context is missing.");
  }

  const params = conversationIdParamSchema.parse(req.params);

  const conversation = await getAnonymousConversation(
    anonymousId,
    params.conversationId,
  );

  res.status(200).json({
    success: true,
    data: serializeConversation(conversation),
  });
}

export async function listUserConversationsController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new Error("Authenticated user context is missing.");
  }

  const params = caseIdParamSchema.parse(req.params);

  const query = listConversationsQuerySchema.parse(req.query);

  const conversations = await listUserConversations(
    userId,
    params.caseId,
    query,
  );

  res.status(200).json({
    success: true,
    data: conversations.map(serializeConversation),
  });
}

export async function listAnonymousConversationsController(
  req: AnonymousAuthenticatedRequest,
  res: Response,
): Promise<void> {
  const anonymousId = req.anonymousAuth?.anonymousId;

  if (!anonymousId) {
    throw new Error("Anonymous authentication context is missing.");
  }

  const params = caseIdParamSchema.parse(req.params);

  const query = listConversationsQuerySchema.parse(req.query);

  const conversations = await listAnonymousConversations(
    anonymousId,
    params.caseId,
    query,
  );

  res.status(200).json({
    success: true,
    data: conversations.map(serializeConversation),
  });
}

export async function closeUserConversationController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new Error("Authenticated user context is missing.");
  }

  const params = conversationIdParamSchema.parse(req.params);

  const conversation = await closeUserConversation(
    userId,
    params.conversationId,
  );

  res.status(200).json({
    success: true,
    message: "Conversation closed successfully.",
    data: serializeConversation(conversation),
  });
}

export async function closeAnonymousConversationController(
  req: AnonymousAuthenticatedRequest,
  res: Response,
): Promise<void> {
  const anonymousId = req.anonymousAuth?.anonymousId;

  if (!anonymousId) {
    throw new Error("Anonymous authentication context is missing.");
  }

  const params = conversationIdParamSchema.parse(req.params);

  const conversation = await closeAnonymousConversation(
    anonymousId,
    params.conversationId,
  );

  res.status(200).json({
    success: true,
    message: "Conversation closed successfully.",
    data: serializeConversation(conversation),
  });
}

function serializeConversation(
  conversation: ConversationDocument,
) {
  return {
    id: conversation._id?.toHexString(),
    caseId: conversation.caseId.toHexString(),
    ownerType: conversation.ownerType,
    userId: conversation.userId?.toHexString(),
    anonymousId: conversation.anonymousId,
    status: conversation.status,
    startedAt: conversation.startedAt,
    lastMessageAt: conversation.lastMessageAt,
    closedAt: conversation.closedAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}