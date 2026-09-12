import {
  Router,
  type Router as ExpressRouter,
} from "express";

import {
  loginController,
  registerController,
  refreshController,
  meController,
  logoutController,
  forgotPasswordController,
   resetPasswordController,
 verifyEmailController,
 resendVerificationController,
} from "../controllers/auth.controller.js";

import {
  validateBody,
} from "../../../shared/middleware/validation.middleware.js";

import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
   resetPasswordSchema,
   resendVerificationSchema,
} from "../schemas/auth.schemas.js";

import {
  authenticate,
} from "../../../shared/middleware/auth.middleware.js";

import {
  loginRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
  resendVerificationRateLimiter,
} from "../../../config/rate-limit.js";

const router: ExpressRouter =
  Router();

router.post(
  "/register",
  validateBody(registerSchema),
  registerController,
);

router.post(
  "/login",
  loginRateLimiter,
  validateBody(loginSchema),
  loginController,
);

router.post(
  "/refresh",
  validateBody(refreshTokenSchema),
  refreshController,
);

router.get(
  "/me",
  authenticate,
  meController,
);

router.post(
  "/logout",
  authenticate,
  logoutController,
);

router.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  validateBody(forgotPasswordSchema),
  forgotPasswordController,
);


router.post(
  "/reset-password",
  resetPasswordRateLimiter,
  validateBody(resetPasswordSchema),
  resetPasswordController,
);

router.get(
  "/verify-email",
  verifyEmailController,
);

router.post(
  "/resend-verification",
  resendVerificationRateLimiter,
  validateBody(resendVerificationSchema),
  resendVerificationController,
);

export default router;