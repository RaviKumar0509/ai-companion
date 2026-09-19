import type { Response } from "express";

import type { AuthenticatedRequest } from "../../../shared/middleware/auth.middleware.js";
import type { AnonymousAuthenticatedRequest } from "../../../shared/middleware/anonymous-auth.middleware.js";

import {
  createAnonymousMessage,
  createUserMessage,
  listAnonymousMessages,
  listUserMessages,
} from "../services/message.service.js";

import {
  conversationIdParamSchema,
  createMessageSchema,
  listMessagesQuerySchema,
} from "../schemas/message.schemas.js";

import type { MessageDocument } from "../types/message.types.js";

export async function createUserMessageController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new Error(
      "Authenticated user context is missing.",
    );
  }

  const input = createMessageSchema.parse(
    req.body,
  );

  const message = await createUserMessage(
    userId,
    input,
  );

  res.status(201).json({
    success: true,
    message: "Message created successfully.",
    data: serializeMessage(message),
  });
}

export async function createAnonymousMessageController(
  req: AnonymousAuthenticatedRequest,
  res: Response,
): Promise<void> {
  const anonymousId =
    req.anonymousAuth?.anonymousId;

  if (!anonymousId) {
    throw new Error(
      "Anonymous authentication context is missing.",
    );
  }

  const input = createMessageSchema.parse(
    req.body,
  );

  const message =
    await createAnonymousMessage(
      anonymousId,
      input,
    );

  res.status(201).json({
    success: true,
    message: "Message created successfully.",
    data: serializeMessage(message),
  });
}

export async function listUserMessagesController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new Error(
      "Authenticated user context is missing.",
    );
  }

  const params =
    conversationIdParamSchema.parse(
      req.params,
    );

  const query =
    listMessagesQuerySchema.parse(
      req.query,
    );

  const messages = await listUserMessages(
    userId,
    params.conversationId,
    query,
  );

  res.status(200).json({
    success: true,
    data: messages.map(serializeMessage),
  });
}

export async function listAnonymousMessagesController(
  req: AnonymousAuthenticatedRequest,
  res: Response,
): Promise<void> {
  const anonymousId =
    req.anonymousAuth?.anonymousId;

  if (!anonymousId) {
    throw new Error(
      "Anonymous authentication context is missing.",
    );
  }

  const params =
    conversationIdParamSchema.parse(
      req.params,
    );

  const query =
    listMessagesQuerySchema.parse(
      req.query,
    );

  const messages =
    await listAnonymousMessages(
      anonymousId,
      params.conversationId,
      query,
    );

  res.status(200).json({
    success: true,
    data: messages.map(serializeMessage),
  });
}

function serializeMessage(
  message: MessageDocument,
) {
  return {
    id: message._id?.toHexString(),
    conversationId:
      message.conversationId.toHexString(),
    senderType: message.senderType,
    contentType: message.contentType,
    content: message.content,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}