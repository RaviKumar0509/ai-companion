import { z } from "zod";

export const createAnonymousIdentitySchema = z.object({
  deviceId: z
    .string()
    .trim()
    .min(16)
    .max(128),
});

export type CreateAnonymousIdentityInput =
  z.infer<typeof createAnonymousIdentitySchema>;

export const anonymousAuthenticationSchema = z.object({
  anonymousId: z
    .string()
    .uuid(),

  anonymousSecret: z
    .string()
    .min(1)
    .max(256),
});

export type AnonymousAuthenticationInput =
  z.infer<typeof anonymousAuthenticationSchema>;