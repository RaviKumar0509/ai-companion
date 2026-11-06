import { ObjectId } from "mongodb";

import {
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/index.js";

import {
  logger,
} from "../../../infrastructure/logger/logger.js";

import {
  findCaseById,
} from "../../case/repositories/case.repository.js";

import {
  buildCaseContextForAI,
} from "../../case/services/case-context-builder.service.js";

import {
  getCaseContext,
} from "../../case/services/case-context.service.js";

import {
  extractAndUpdateCaseContext,
} from "../../case/services/case-context-extraction.service.js";

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

import {
  MESSAGE_CONSTANTS,
} from "../constants/message.constants.js";

import {
  buildAIMessageContext,
} from "./message-context.service.js";

import {
  createEscalationForSafetyEvent,
} from "../../safety/services/escalation.service.js";

/**
 * These provider labels indicate that the assistant did not return a normal
 * AI-generated conversational answer. Do not extract recovery context from
 * a crisis response, an infrastructure fallback, or an output-safety reply.
 */
const NON_EXTRACTABLE_AI_PROVIDERS = new Set([
  "safety",
  "fallback",
  "output-safety",
]);

/**
 * Case-context extraction is secondary to the main conversation response.
 * Extraction errors are contained here so they cannot turn a successfully
 * persisted assistant message into a failed chat request.
 *
 * Note: this currently awaits the extraction call. A durable background
 * queue with retries and structured failure logging is a production follow-up.
 */
async function updateCaseContextSafely(
  caseId: ObjectId,
  messages: AIMessage[],
  responseProvider: string,
): Promise<void> {
  if (NON_EXTRACTABLE_AI_PROVIDERS.has(responseProvider)) {
    return;
  }

  try {
    await extractAndUpdateCaseContext(caseId, messages);
  } catch (error) {
    logger.error(
      {
        errorName:
          error instanceof Error
            ? error.name
            : "UnknownError",
        caseId: caseId.toHexString(),
        operation: "extract-and-update-case-context",
      },
      "Case context extraction failed; chat response will continue",
    );
  }
}

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

const safetyEvent = await persistSafetyEvent({
  conversationId: conversationObjectId,
  caseId: conversation.caseId,
  ownerType: "user",
  userId: userObjectId,
  safetyResult,
});

try {
  await createEscalationForSafetyEvent(safetyEvent);
} catch (error: unknown) {
  logger.error(
    {
      errorName:
        error instanceof Error
          ? error.name
          : "UnknownError",
      safetyEventId: safetyEvent._id?.toHexString(),
      operation: "create-crisis-escalation",
    },
    "Crisis escalation creation failed",
  );
}

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
   * CASE-CONTEXT EXTRACTION
   * --------------------------------------------------
   *
   * This runs only after the assistant message is saved.
   * Extraction failures must not break the main response.
   */
  await updateCaseContextSafely(
    conversation.caseId,
    aiMessages,
    aiResponse.provider,
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

const safetyEvent = await persistSafetyEvent({
  conversationId: conversationObjectId,
  caseId: conversation.caseId,
  ownerType: "anonymous",
  anonymousId,
  safetyResult,
});

try {
  await createEscalationForSafetyEvent(safetyEvent);
} catch (error: unknown) {
  logger.error(
    {
      errorName:
        error instanceof Error
          ? error.name
          : "UnknownError",
      safetyEventId: safetyEvent._id?.toHexString(),
      operation: "create-crisis-escalation",
    },
    "Anonymous crisis escalation creation failed",
  );
}

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
   * CASE-CONTEXT EXTRACTION
   * --------------------------------------------------
   */
  await updateCaseContextSafely(
    conversation.caseId,
    aiMessages,
    aiResponse.provider,
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
