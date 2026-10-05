import { z } from "zod";

export const safetyTextSchema = z
  .object({
    content: z.string().trim().min(1, "Content is required.").max(10_000),
  })
  .strict();

export type SafetyTextInput = z.infer<typeof safetyTextSchema>;