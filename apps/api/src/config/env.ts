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

TRUST_PROXY: z.coerce
  .number()
  .int()
  .nonnegative()
  .default(0),

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
  
   JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must contain at least 32 characters"),
    MAIL_HOST: z
  .string()
  .min(1),

MAIL_PORT: z.coerce
  .number()
  .int()
  .positive(),

MAIL_SECURE: z
  .enum(["true", "false"])
  .transform((value) => value === "true"),

MAIL_USER: z
  .string()
  .email(),

MAIL_PASSWORD: z
  .string()
  .min(1),

MAIL_FROM: z
  .string()
  .email(),
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