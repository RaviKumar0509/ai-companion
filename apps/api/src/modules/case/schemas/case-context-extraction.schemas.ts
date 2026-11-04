import { z } from "zod";

const extractedContextItemSchema = z
  .string()
  .trim()
  .min(1)
  .max(500);

export const caseContextExtractionSchema = z
  .object({
    summary: z
      .string()
      .trim()
      .min(1)
      .max(2_000)
      .nullable(),

    recoveryGoals: z
      .array(extractedContextItemSchema)
      .max(20),

    knownTriggers: z
      .array(extractedContextItemSchema)
      .max(20),

    copingStrategies: z
      .array(extractedContextItemSchema)
      .max(20),

    supportPreferences: z
      .array(extractedContextItemSchema)
      .max(20),
  })
  .strict();

export type CaseContextExtraction = z.infer<
  typeof caseContextExtractionSchema
>;