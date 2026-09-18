import { z } from "zod";

export const createConversationSchema = z
  .object({
    caseId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, "Invalid case ID."),
  })
  .strict();

export type CreateConversationInput = z.infer<
  typeof createConversationSchema
>;

export const conversationIdParamSchema = z
  .object({
    conversationId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, "Invalid conversation ID."),
  })
  .strict();

export type ConversationIdParam = z.infer<
  typeof conversationIdParamSchema
>;

export const caseIdParamSchema = z
  .object({
    caseId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, "Invalid case ID."),
  })
  .strict();

export type CaseIdParam = z.infer<typeof caseIdParamSchema>;

export const listConversationsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    skip: z.coerce.number().int().min(0).max(10_000).default(0),
  })
  .strict();

export type ListConversationsQuery = z.infer<
  typeof listConversationsQuerySchema
>;