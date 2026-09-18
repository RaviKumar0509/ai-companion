import { ObjectId } from "mongodb";

import {
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/index.js";

import {
  findCaseById,
} from "../../case/repositories/case.repository.js";

import {
  createConversation,
  findAnonymousConversationById,
  findUserConversationById,
  listAnonymousConversationsByCaseId,
  listUserConversationsByCaseId,
  updateConversation,
} from "../repositories/conversation.repository.js";

import {
  CONVERSATION_OWNER_TYPE,
  CONVERSATION_STATUS,
  type ConversationDocument,
} from "../types/conversation.types.js";

import type {
  CreateConversationInput,
  ListConversationsQuery,
} from "../schemas/conversation.schemas.js";

export async function createUserConversation(
  userId: string,
  input: CreateConversationInput,
): Promise<ConversationDocument> {
  const userObjectId = toObjectId(userId);
  const caseObjectId = toObjectId(input.caseId);

const caseDocument = await findCaseById(caseObjectId);

if (
  !caseDocument ||
  caseDocument.ownerType !== "user" ||
  !caseDocument.userId ||
  caseDocument.userId.toHexString() !== userObjectId.toHexString() ||
  caseDocument.status !== "active"
) {
  throw new NotFoundError("Case not found.");
}

  const now = new Date();

  const conversation: ConversationDocument = {
    caseId: caseObjectId,
    ownerType: CONVERSATION_OWNER_TYPE.USER,
    userId: userObjectId,
    status: CONVERSATION_STATUS.ACTIVE,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  return createConversation(conversation);
}

export async function createAnonymousConversation(
  anonymousId: string,
  input: CreateConversationInput,
): Promise<ConversationDocument> {
  const caseObjectId = toObjectId(input.caseId);

const caseDocument = await findCaseById(caseObjectId);

if (
  !caseDocument ||
  caseDocument.ownerType !== "anonymous" ||
  caseDocument.anonymousId !== anonymousId ||
  caseDocument.status !== "active"
) {
  throw new NotFoundError("Case not found.");
}

  const now = new Date();

  const conversation: ConversationDocument = {
    caseId: caseObjectId,
    ownerType: CONVERSATION_OWNER_TYPE.ANONYMOUS,
    anonymousId,
    status: CONVERSATION_STATUS.ACTIVE,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  return createConversation(conversation);
}

export async function getUserConversation(
  userId: string,
  conversationId: string,
): Promise<ConversationDocument> {
  const userObjectId = toObjectId(userId);
  const conversationObjectId = toObjectId(conversationId);

  const conversation = await findUserConversationById(
    conversationObjectId,
    userObjectId,
  );

  if (!conversation) {
    throw new NotFoundError("Conversation not found.");
  }

  return conversation;
}

export async function getAnonymousConversation(
  anonymousId: string,
  conversationId: string,
): Promise<ConversationDocument> {
  const conversationObjectId = toObjectId(conversationId);

  const conversation = await findAnonymousConversationById(
    conversationObjectId,
    anonymousId,
  );

  if (!conversation) {
    throw new NotFoundError("Conversation not found.");
  }

  return conversation;
}

export async function listUserConversations(
  userId: string,
  caseId: string,
  query: ListConversationsQuery,
): Promise<ConversationDocument[]> {
  const userObjectId = toObjectId(userId);
  const caseObjectId = toObjectId(caseId);

  const caseDocument = await findCaseById(caseObjectId);

  if (
    !caseDocument ||
    caseDocument.ownerType !== "user" ||
    !caseDocument.userId ||
    caseDocument.userId.toHexString() !== userObjectId.toHexString()
  ) {
    throw new NotFoundError("Case not found.");
  }

  return listUserConversationsByCaseId(
    caseObjectId,
    userObjectId,
    query.limit,
    query.skip,
  );
}

export async function listAnonymousConversations(
  anonymousId: string,
  caseId: string,
  query: ListConversationsQuery,
): Promise<ConversationDocument[]> {
  const caseObjectId = toObjectId(caseId);

  const caseDocument = await findCaseById(caseObjectId);

  if (
    !caseDocument ||
    caseDocument.ownerType !== "anonymous" ||
    caseDocument.anonymousId !== anonymousId
  ) {
    throw new NotFoundError("Case not found.");
  }

  return listAnonymousConversationsByCaseId(
    caseObjectId,
    anonymousId,
    query.limit,
    query.skip,
  );
}

export async function closeUserConversation(
  userId: string,
  conversationId: string,
): Promise<ConversationDocument> {
  const userObjectId = toObjectId(userId);
  const conversationObjectId = toObjectId(conversationId);

  const conversation = await findUserConversationById(
    conversationObjectId,
    userObjectId,
  );

  if (!conversation) {
    throw new NotFoundError("Conversation not found.");
  }

  if (conversation.status === CONVERSATION_STATUS.CLOSED) {
    throw new ValidationError(
      "Conversation is already closed.",
    );
  }

  const now = new Date();

  const updated = await updateConversation(
    conversationObjectId,
    {
      status: CONVERSATION_STATUS.CLOSED,
      closedAt: now,
      updatedAt: now,
    },
  );

  if (!updated) {
    throw new NotFoundError("Conversation not found.");
  }

  const updatedConversation =
    await findUserConversationById(
      conversationObjectId,
      userObjectId,
    );

  if (!updatedConversation) {
    throw new NotFoundError("Conversation not found.");
  }

  return updatedConversation;
}

export async function closeAnonymousConversation(
  anonymousId: string,
  conversationId: string,
): Promise<ConversationDocument> {
  const conversationObjectId = toObjectId(conversationId);

  const conversation =
    await findAnonymousConversationById(
      conversationObjectId,
      anonymousId,
    );

  if (!conversation) {
    throw new NotFoundError("Conversation not found.");
  }

  if (conversation.status === CONVERSATION_STATUS.CLOSED) {
    throw new ValidationError(
      "Conversation is already closed.",
    );
  }

  const now = new Date();

  const updated = await updateConversation(
    conversationObjectId,
    {
      status: CONVERSATION_STATUS.CLOSED,
      closedAt: now,
      updatedAt: now,
    },
  );

  if (!updated) {
    throw new NotFoundError("Conversation not found.");
  }

  const updatedConversation =
    await findAnonymousConversationById(
      conversationObjectId,
      anonymousId,
    );

  if (!updatedConversation) {
    throw new NotFoundError("Conversation not found.");
  }

  return updatedConversation;
}

function toObjectId(value: string): ObjectId {
  if (!ObjectId.isValid(value)) {
    throw new ValidationError(
      "Invalid MongoDB ObjectId.",
    );
  }

  return new ObjectId(value);
}