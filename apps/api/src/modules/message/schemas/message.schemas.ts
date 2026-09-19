import { z } from "zod";

import {
  MESSAGE_CONSTANTS,
} from "../constants/message.constants.js";

export const createMessageSchema = z
  .object({
    conversationId: z
      .string()
      .regex(
        /^[a-f\d]{24}$/i,
        "Invalid conversation ID.",
      ),

    content: z
      .string()
      .trim()
      .min(1, "Message content is required.")
      .max(
        MESSAGE_CONSTANTS.MAX_MESSAGE_LENGTH,
        `Message content cannot exceed ${MESSAGE_CONSTANTS.MAX_MESSAGE_LENGTH} characters.`,
      ),
  })
  .strict();

export type CreateMessageInput =
  z.infer<typeof createMessageSchema>;

export const messageIdParamSchema = z
  .object({
    messageId: z
      .string()
      .regex(
        /^[a-f\d]{24}$/i,
        "Invalid message ID.",
      ),
  })
  .strict();

export type MessageIdParam =
  z.infer<typeof messageIdParamSchema>;

export const conversationIdParamSchema = z
  .object({
    conversationId: z
      .string()
      .regex(
        /^[a-f\d]{24}$/i,
        "Invalid conversation ID.",
      ),
  })
  .strict();

export type ConversationIdParam =
  z.infer<typeof conversationIdParamSchema>;

export const listMessagesQuerySchema = z
  .object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(
        MESSAGE_CONSTANTS.MAX_LIST_LIMIT,
      )
      .default(
        MESSAGE_CONSTANTS.DEFAULT_LIST_LIMIT,
      ),

    skip: z.coerce
      .number()
      .int()
      .min(0)
      .max(10_000)
      .default(0),
  })
  .strict();

export type ListMessagesQuery =
  z.infer<typeof listMessagesQuerySchema>;