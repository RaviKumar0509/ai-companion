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
  assessSafety,
} from "../../safety/services/safety.service.js";

import {
  persistSafetyEvent,
} from "../../safety/services/safety-event.service.js";

import {
  orchestrateAI,
} from "../../ai/services/ai-orchestrator.service.js";

import type {
  AIMessage,
} from "../../../infrastructure/ai/ai-provider.types.js";

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

import { MESSAGE_CONSTANTS } from "../constants/message.constants.js";

import { buildAIMessageContext } from "./message-context.service.js";

import { buildCaseContextForAI } from "../../case/services/case-context-builder.service.js";
import { getCaseContext } from "../../case/services/case-context.service.js";



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

  /*
   * --------------------------------------------------
   * SAFETY CHECK
   * --------------------------------------------------
   *
   * Deterministic safety assessment happens before
   * the message is sent to the AI provider.
   */
  const safetyResult = assessSafety(
    input.content,
  );

  await persistSafetyEvent({
  conversationId: conversationObjectId,
  caseId: conversation.caseId,
  ownerType: "user",
  userId: userObjectId,
  safetyResult,
});

  /*
   * --------------------------------------------------
   * USER MESSAGE
   * --------------------------------------------------
   */

  const userMessageTime = new Date();

  const userMessage: MessageDocument = {
    conversationId: conversationObjectId,
    senderType: MESSAGE_SENDER_TYPE.USER,
    contentType: MESSAGE_CONTENT_TYPE.TEXT,
    content: input.content,
    createdAt: userMessageTime,
    updatedAt: userMessageTime,
  };

  const createdUserMessage =
    await createMessage(userMessage);

  await updateConversationLastMessageAt(
    conversationObjectId,
    userMessageTime,
  );

  /*
   * --------------------------------------------------
   * CONVERSATION CONTEXT
   * --------------------------------------------------
   */

const recentMessages = await listMessagesByConversationId(
  conversationObjectId,
  MESSAGE_CONSTANTS.MAX_AI_CONTEXT_MESSAGES,
  0,
);

const contextMessages = buildAIMessageContext(
  recentMessages,
);

const aiMessages = toAIMessages(
  contextMessages,
);

const caseContext = await getCaseContext(
  conversation.caseId,
);

const aiCaseContext = buildCaseContextForAI(
  caseContext,
);

  /*
   * --------------------------------------------------
   * AI ORCHESTRATION
   * --------------------------------------------------
   *
   * The orchestrator decides whether the request
   * should go to Gemini, use a fallback, or follow
   * the crisis path.
   */
const aiResponse = await orchestrateAI({
  messages: aiMessages,
  safetyResult,
  ...(aiCaseContext
    ? { caseContext: aiCaseContext }
    : {}),
});

  /*
   * --------------------------------------------------
   * ASSISTANT MESSAGE
   * --------------------------------------------------
   */

  const assistantMessageTime = new Date();

  const assistantMessage: MessageDocument = {
    conversationId: conversationObjectId,
    senderType: MESSAGE_SENDER_TYPE.ASSISTANT,
    contentType: MESSAGE_CONTENT_TYPE.TEXT,
    content: aiResponse.content,
    createdAt: assistantMessageTime,
    updatedAt: assistantMessageTime,
  };

  const createdAssistantMessage =
    await createMessage(assistantMessage);

  await updateConversationLastMessageAt(
    conversationObjectId,
    assistantMessageTime,
  );

  /*
   * --------------------------------------------------
   * RETURN ASSISTANT MESSAGE
   * --------------------------------------------------
   *
   * The existing controller expects a MessageDocument,
   * so we return the assistant message here.
   */
  return createdAssistantMessage;
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

  /*
   * --------------------------------------------------
   * SAFETY CHECK
   * --------------------------------------------------
   */

  const safetyResult = assessSafety(
    input.content,
  );

  await persistSafetyEvent({
  conversationId: conversationObjectId,
  caseId: conversation.caseId,
  ownerType: "anonymous",
  anonymousId,
  safetyResult,
});

  /*
   * --------------------------------------------------
   * USER MESSAGE
   * --------------------------------------------------
   */

  const userMessageTime = new Date();

  const userMessage: MessageDocument = {
    conversationId: conversationObjectId,
    senderType: MESSAGE_SENDER_TYPE.USER,
    contentType: MESSAGE_CONTENT_TYPE.TEXT,
    content: input.content,
    createdAt: userMessageTime,
    updatedAt: userMessageTime,
  };

  await createMessage(userMessage);

  await updateConversationLastMessageAt(
    conversationObjectId,
    userMessageTime,
  );

  /*
   * --------------------------------------------------
   * CONVERSATION CONTEXT
   * --------------------------------------------------
   */

const recentMessages = await listMessagesByConversationId(
  conversationObjectId,
  MESSAGE_CONSTANTS.MAX_AI_CONTEXT_MESSAGES,
  0,
);

const contextMessages = buildAIMessageContext(recentMessages);

const aiMessages = toAIMessages(
  contextMessages,
);

const caseContext = await getCaseContext(
  conversation.caseId,
);

const aiCaseContext = buildCaseContextForAI(
  caseContext,
);
  /*
   * --------------------------------------------------
   * AI ORCHESTRATION
   * --------------------------------------------------
   */

const aiResponse = await orchestrateAI({
  messages: aiMessages,
  safetyResult,
  ...(aiCaseContext
    ? { caseContext: aiCaseContext }
    : {}),
});
  /*
   * --------------------------------------------------
   * ASSISTANT MESSAGE
   * --------------------------------------------------
   */

  const assistantMessageTime = new Date();

  const assistantMessage: MessageDocument = {
    conversationId: conversationObjectId,
    senderType: MESSAGE_SENDER_TYPE.ASSISTANT,
    contentType: MESSAGE_CONTENT_TYPE.TEXT,
    content: aiResponse.content,
    createdAt: assistantMessageTime,
    updatedAt: assistantMessageTime,
  };

  const createdAssistantMessage =
    await createMessage(assistantMessage);

  await updateConversationLastMessageAt(
    conversationObjectId,
    assistantMessageTime,
  );

  return createdAssistantMessage;
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
  if (
    status !== CONVERSATION_STATUS.ACTIVE
  ) {
    throw new ValidationError(
      "Messages cannot be added to a closed conversation.",
    );
  }
}

function toAIMessages(
  messages: MessageDocument[],
): AIMessage[] {
  return messages
    .filter(
      (message) =>
        message.contentType ===
        MESSAGE_CONTENT_TYPE.TEXT,
    )
    .map((message) => {
      if (
        message.senderType ===
        MESSAGE_SENDER_TYPE.USER
      ) {
        return {
          role: "user",
          content: message.content,
        } satisfies AIMessage;
      }

      if (
        message.senderType ===
        MESSAGE_SENDER_TYPE.ASSISTANT
      ) {
        return {
          role: "assistant",
          content: message.content,
        } satisfies AIMessage;
      }

      return {
        role: "system",
        content: message.content,
      } satisfies AIMessage;
    });
}

function toObjectId(
  value: string,
): ObjectId {
  if (!ObjectId.isValid(value)) {
    throw new ValidationError(
      "Invalid MongoDB ObjectId.",
    );
  }

  return new ObjectId(value);
}