import { ObjectId } from "mongodb";

import {
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/index.js";

import {
  findCaseById,
} from "../../case/repositories/case.repository.js";
import {
  updateConversationLastMessageAt,
} from "../../conversation/repositories/conversation.repository.js";

import {
  findAnonymousConversationById,
  findUserConversationById,
} from "../../conversation/repositories/conversation.repository.js";

import {
  CONVERSATION_STATUS,
} from "../../conversation/types/conversation.types.js";

import {
  createMessage,
  listMessagesByConversationId,
} from "../repositories/message.repository.js";

import {
  MESSAGE_CONTENT_TYPE,
  MESSAGE_SENDER_TYPE,
  type MessageDocument,
} from "../types/message.types.js";

import type {
  CreateMessageInput,
  ListMessagesQuery,
} from "../schemas/message.schemas.js";

export async function createUserMessage(
  userId: string,
  input: CreateMessageInput,
): Promise<MessageDocument> {
  const userObjectId = toObjectId(userId);
  const conversationObjectId = toObjectId(
    input.conversationId,
  );

  const conversation =
    await findUserConversationById(
      conversationObjectId,
      userObjectId,
    );

  if (!conversation) {
    throw new NotFoundError(
      "Conversation not found.",
    );
  }

  validateConversationIsActive(
    conversation.status,
  );

  const caseDocument = await findCaseById(
    conversation.caseId,
  );

  if (
    !caseDocument ||
    caseDocument.ownerType !== "user" ||
    !caseDocument.userId ||
    caseDocument.userId.toHexString() !==
      userObjectId.toHexString()
  ) {
    throw new NotFoundError(
      "Conversation not found.",
    );
  }

  const now = new Date();

  const message: MessageDocument = {
    conversationId: conversationObjectId,
    senderType: MESSAGE_SENDER_TYPE.USER,
    contentType: MESSAGE_CONTENT_TYPE.TEXT,
    content: input.content,
    createdAt: now,
    updatedAt: now,
  };

 const createdMessage = await createMessage(message);

await updateConversationLastMessageAt(
  conversationObjectId,
  now,
);

return createdMessage;
}

export async function createAnonymousMessage(
  anonymousId: string,
  input: CreateMessageInput,
): Promise<MessageDocument> {
  const conversationObjectId = toObjectId(
    input.conversationId,
  );

  const conversation =
    await findAnonymousConversationById(
      conversationObjectId,
      anonymousId,
    );

  if (!conversation) {
    throw new NotFoundError(
      "Conversation not found.",
    );
  }

  validateConversationIsActive(
    conversation.status,
  );

  const caseDocument = await findCaseById(
    conversation.caseId,
  );

  if (
    !caseDocument ||
    caseDocument.ownerType !== "anonymous" ||
    caseDocument.anonymousId !== anonymousId
  ) {
    throw new NotFoundError(
      "Conversation not found.",
    );
  }

  const now = new Date();

  const message: MessageDocument = {
    conversationId: conversationObjectId,
    senderType: MESSAGE_SENDER_TYPE.USER,
    contentType: MESSAGE_CONTENT_TYPE.TEXT,
    content: input.content,
    createdAt: now,
    updatedAt: now,
  };

  const createdMessage = await createMessage(message);

await updateConversationLastMessageAt(
  conversationObjectId,
  now,
);

return createdMessage;
}

export async function listUserMessages(
  userId: string,
  conversationId: string,
  query: ListMessagesQuery,
): Promise<MessageDocument[]> {
  const userObjectId = toObjectId(userId);
  const conversationObjectId = toObjectId(
    conversationId,
  );

  const conversation =
    await findUserConversationById(
      conversationObjectId,
      userObjectId,
    );

  if (!conversation) {
    throw new NotFoundError(
      "Conversation not found.",
    );
  }

  return listMessagesByConversationId(
    conversationObjectId,
    query.limit,
    query.skip,
  );
}

export async function listAnonymousMessages(
  anonymousId: string,
  conversationId: string,
  query: ListMessagesQuery,
): Promise<MessageDocument[]> {
  const conversationObjectId = toObjectId(
    conversationId,
  );

  const conversation =
    await findAnonymousConversationById(
      conversationObjectId,
      anonymousId,
    );

  if (!conversation) {
    throw new NotFoundError(
      "Conversation not found.",
    );
  }

  return listMessagesByConversationId(
    conversationObjectId,
    query.limit,
    query.skip,
  );
}

function validateConversationIsActive(
  status: string,
): void {
  if (status !== CONVERSATION_STATUS.ACTIVE) {
    throw new ValidationError(
      "Messages cannot be added to a closed conversation.",
    );
  }
}

function toObjectId(value: string): ObjectId {
  if (!ObjectId.isValid(value)) {
    throw new ValidationError(
      "Invalid MongoDB ObjectId.",
    );
  }

  return new ObjectId(value);
}