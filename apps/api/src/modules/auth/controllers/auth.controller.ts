import type {
  NextFunction,
  RequestHandler,
  Response,
} from "express";

import {
  ObjectId,
} from "mongodb";

import {
  loginUser,
  registerUser,
} from "../services/auth.service.js";

import {
  requestPasswordReset,
  resetPassword,
} from "../services/password-reset.service.js";

import {
  verifyEmail,
  issueEmailVerificationToken,
} from "../services/email-verification.service.js";

import {
  verifyEmailSchema,
} from "../schemas/auth.schemas.js";

import type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ResendVerificationInput,
} from "../schemas/auth.schemas.js";

import {
  refreshAuthentication,
} from "../services/refresh.service.js";

import {
  findUserById,
  findUserByEmail,
} from "../repositories/user.repository.js";

import type {
  PublicUser,
} from "../types/user.types.js";

import type {
  AuthenticatedRequest,
} from "../../../shared/middleware/auth.middleware.js";

import {
  UnauthorizedError,
    InvalidCredentialsError,
  ValidationError,
} from "../../../shared/errors/index.js";

import {
  logoutUser,
} from "../services/session.service.js";

/**
 * Register a new user account.
 *
 * Controller responsibility:
 * - Read the validated request body.
 * - Call the authentication service.
 * - Build the HTTP response.
 * - Forward errors to the global error handler.
 *
 * Business logic must remain inside auth.service.ts.
 */
export const registerController: RequestHandler =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const input =
        req.body as RegisterInput;

      const user =
        await registerUser(input);
 
      await issueEmailVerificationToken(user.id);

      res.status(201).json({
        success: true,

        message:
          "Registration successful.",

        data: {
          user,
        },

        requestId:
          res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };


  export const resendVerificationController: RequestHandler =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const input =
        req.body as ResendVerificationInput;

      const user =
        await findUserByEmail(input.email);

      /*
       * Always return the same response whether
       * the account exists, is already verified,
       * or does not exist.
       *
       * This prevents account enumeration.
       */
      if (user && !user.emailVerified) {
        await issueEmailVerificationToken(
          user._id!.toString(),
        );
      }

      res.status(200).json({
        success: true,
        message:
          "If the account exists and requires verification, verification instructions have been sent.",
        requestId:
          res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };



  export const verifyEmailController: RequestHandler =
  async (req, res, next) => {
    try {
      const result =
        verifyEmailSchema.safeParse(
          req.query,
        );

      if (!result.success) {
        throw new ValidationError(
          "Invalid email verification token.",
        );
      }

      await verifyEmail(
        result.data.token,
      );

      res.status(200).json({
        success: true,
        message:
          "Email address verified successfully.",
        requestId:
          res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };

/**
 * Authenticate an existing user.
 *
 * The authentication service is responsible for:
 * - Finding the user.
 * - Verifying the password.
 * - Creating the authentication session.
 * - Generating the access token.
 * - Generating the refresh token.
 *
 * The controller only handles the HTTP boundary.
 */
export const loginController: RequestHandler =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const input =
        req.body as LoginInput;

      const authenticationResult =
        await loginUser(input);

      res.status(200).json({
        success: true,

        message:
          "Login successful.",

        data:
          authenticationResult,

        requestId:
          res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };

/**
 * Refresh an authentication session.
 *
 * Request validation is handled by
 * refreshTokenSchema before this controller
 * is executed.
 */
export const refreshController: RequestHandler =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const refreshToken =
        req.body.refreshToken as string;

      const tokens =
        await refreshAuthentication(
          refreshToken,
        );

      res.status(200).json({
        success: true,

        message:
          "Token refreshed successfully.",

        data: {
          tokens,
        },

        requestId:
          res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };

/**
 * Get the currently authenticated user.
 *
 * Authentication middleware is responsible for:
 * - Verifying the access token.
 * - Validating the session.
 * - Attaching userId/sessionId to req.auth.
 *
 * This controller only retrieves and returns
 * the safe public user representation.
 */
export const meController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const auth = req.auth;

    if (!auth) {
      throw new UnauthorizedError(
        "Authentication required.",
      );
    }

    const user =
      await findUserById(
        new ObjectId(auth.userId),
      );

    if (!user) {
      throw new UnauthorizedError(
        "Invalid authentication credentials.",
      );
    }

    const publicUser: PublicUser = {
      id: user._id!.toString(),
      email: user.email,
      status: user.status,
      emailVerified:
        user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({
      success: true,

      data: {
        user: publicUser,
      },

      requestId:
        res.locals.requestId,
    });
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * Logout the currently authenticated user.
 *
 * Authentication middleware guarantees that
 * req.auth contains a validated userId and
 * sessionId before this controller executes.
 *
 * The session is revoked server-side so the
 * authentication session can no longer be used.
 * 
 * 
 */
export const forgotPasswordController: RequestHandler =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const input =
        req.body as ForgotPasswordInput;

      await requestPasswordReset(
        input.email,
      );

      res.status(200).json({
        success: true,

        message:
          "If the account exists, password reset instructions have been sent.",

        requestId:
          res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };

  export const resetPasswordController: RequestHandler =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const input =
        req.body as ResetPasswordInput;

      await resetPassword(
        input.token,
        input.newPassword,
      );

      res.status(200).json({
        success: true,
        message:
          "Password has been reset successfully.",
        requestId:
          res.locals.requestId,
      });
    } catch (error: unknown) {
      next(error);
    }
  };



export const logoutController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const auth = req.auth;

    if (!auth) {
      throw new UnauthorizedError(
        "Authentication required.",
      );
    }

    await logoutUser(
      auth.sessionId,
    );

    res.status(200).json({
      success: true,

      message:
        "Logout successful.",

      requestId:
        res.locals.requestId,
    });
  } catch (error: unknown) {
    next(error);
  }

  
};