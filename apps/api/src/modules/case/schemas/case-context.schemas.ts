import { z } from "zod";

const caseContextItemSchema = z
  .string()
  .trim()
  .min(1)
  .max(500);

export const updateCaseContextSchema = z
  .object({
    summary: z.string().trim().min(1).max(2_000).optional(),

    recoveryGoals: z
      .array(caseContextItemSchema)
      .max(20)
      .optional(),

    knownTriggers: z
      .array(caseContextItemSchema)
      .max(20)
      .optional(),

    copingStrategies: z
      .array(caseContextItemSchema)
      .max(20)
      .optional(),

    supportPreferences: z
      .array(caseContextItemSchema)
      .max(20)
      .optional(),

    riskNotes: z
      .array(caseContextItemSchema)
      .max(20)
      .optional(),
  })
  .strict();

export type UpdateCaseContextInput = z.infer<
  typeof updateCaseContextSchema
>;