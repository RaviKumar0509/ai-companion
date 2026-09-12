import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(12)
    .max(128),
});

export type RegisterInput =
  z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email(),

  password: z
    .string()
    .min(1),
});

export type LoginInput =
  z.infer<typeof loginSchema>;

export const refreshTokenSchema =
  z.object({
    refreshToken:
      z.string().min(1),
  });

export type RefreshTokenInput =
  z.infer<
    typeof refreshTokenSchema
  >;

export const forgotPasswordSchema =
  z.object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) =>
        value.toLowerCase(),
      ),
  });

export type ForgotPasswordInput =
  z.infer<
    typeof forgotPasswordSchema
  >;


  export const resetPasswordSchema =
  z.object({
    token: z
      .string()
      .min(1),

    newPassword: z
      .string()
      .min(12)
      .max(128),
  });

export type ResetPasswordInput =
  z.infer<
    typeof resetPasswordSchema
  >;

  export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export type VerifyEmailInput =
  z.infer<typeof verifyEmailSchema>;


  export const resendVerificationSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
});

export type ResendVerificationInput =
  z.infer<typeof resendVerificationSchema>;