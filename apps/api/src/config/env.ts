import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(4000),

  WEB_APP_URL: z
    .string()
    .url(),

  MONGODB_USERNAME: z
    .string()
    .min(1),

  MONGODB_PASSWORD: z
    .string()
    .min(1),

  MONGODB_HOST: z
    .string()
    .min(1),

  MONGODB_DATABASE: z
    .string()
    .min(1),
});

const result = envSchema.safeParse(
  process.env,
);

if (!result.success) {
  console.error(
    "❌ Invalid environment configuration",
  );

  console.error(
    result.error.flatten(),
  );

  process.exit(1);
}

export const env = result.data;