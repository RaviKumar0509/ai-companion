import { env } from "./env.js";

export const aiConfig = {
  provider: env.AI_PROVIDER,
  model: env.AI_MODEL,
} as const;