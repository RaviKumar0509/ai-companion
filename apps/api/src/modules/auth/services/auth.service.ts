import {
  MongoServerError,
} from "mongodb";

import {
  ConflictError,
  UnauthorizedError,
} from "../../../shared/errors/index.js";

import {
  hashPassword,
  verifyPassword,
} from "./password.service.js";

import {
  createUser,
  findUserByEmail,
} from "../repositories/user.repository.js";

import {
  createUserSession,
} from "./session.service.js";

import {
  generateAccessToken,
} from "./token.service.js";

import type {
  RegisterInput,
  LoginInput,
} from "../schemas/auth.schemas.js";

import {
  USER_STATUS,
} from "../types/user.types.js";

import type {
  PublicUser,
  AuthenticationResult,
} from "../types/auth.types.js";

export async function registerUser(
  input: RegisterInput,
): Promise<PublicUser> {
  const email =
    input.email.toLowerCase();

  /*
   * --------------------------------------------------
   * 1. Check whether the email is already registered.
   * --------------------------------------------------
   */

  const existingUser =
    await findUserByEmail(email);

  if (existingUser) {
    throw new ConflictError(
      "An account with this email already exists.",
    );
  }

  /*
   * --------------------------------------------------
   * 2. Hash the password.
   * --------------------------------------------------
   */

  const passwordHash =
    await hashPassword(
      input.password,
    );

  /*
   * --------------------------------------------------
   * 3. Create the user.
   * --------------------------------------------------
   */

  try {
    const user =
      await createUser({
        email,
        passwordHash,
        status:
          USER_STATUS.ACTIVE,
        emailVerified: false,
        createdAt:
          new Date(),
        updatedAt:
          new Date(),
      });

    /*
     * ------------------------------------------------
     * 4. Never return passwordHash.
     * ------------------------------------------------
     */

    if (!user._id) {
      throw new Error(
        "User was created without an ID.",
      );
    }

    return {
      id:
        user._id.toString(),

      email:
        user.email,

      status:
        user.status,

      emailVerified:
        user.emailVerified,

      createdAt:
        user.createdAt,

      updatedAt:
        user.updatedAt,
    };
  } catch (
    error: unknown
  ) {
    /*
     * ------------------------------------------------
     * Race-condition protection.
     *
     * MongoDB unique index remains the final
     * authority for email uniqueness.
     * ------------------------------------------------
     */

    if (
      error instanceof
        MongoServerError &&
      error.code === 11000
    ) {
      throw new ConflictError(
        "An account with this email already exists.",
      );
    }

    throw error;
  }
}

export async function loginUser(
  input: LoginInput,
): Promise<AuthenticationResult> {
  const email =
    input.email.toLowerCase();

  /*
   * --------------------------------------------------
   * 1. Find user.
   * --------------------------------------------------
   */

  const user =
    await findUserByEmail(email);

  /*
   * IMPORTANT:
   *
   * Do not reveal whether the email exists.
   *
   * This protects against account enumeration.
   * --------------------------------------------------
   */

  if (!user) {
    throw new UnauthorizedError(
      "Invalid email or password.",
    );
  }

  /*
   * --------------------------------------------------
   * 2. Verify password.
   * --------------------------------------------------
   */

  const passwordValid =
    await verifyPassword(
      user.passwordHash,
      input.password,
    );

  if (!passwordValid) {
    throw new UnauthorizedError(
      "Invalid email or password.",
    );
  }

  /*
   * --------------------------------------------------
   * 3. Ensure the account can authenticate.
   * --------------------------------------------------
   */

  if (
    user.status !==
    USER_STATUS.ACTIVE
  ) {
    throw new UnauthorizedError(
      "This account is not available for authentication.",
    );
  }

  /*
   * --------------------------------------------------
   * 4. User ID is required for session creation.
   * --------------------------------------------------
   */

  if (!user._id) {
    throw new Error(
      "User was found without an ID.",
    );
  }

  /*
   * --------------------------------------------------
   * 5. Create server-side authentication session.
   * --------------------------------------------------
   */

  const {
    session,
    refreshToken,
  } =
    await createUserSession({
      userId:
        user._id,
      platform:
        "web",
    });

  /*
   * --------------------------------------------------
   * 6. Generate short-lived access token.
   * --------------------------------------------------
   */

  const accessToken =
    await generateAccessToken(
      user._id.toString(),
      session.sessionId,
    );

  /*
   * --------------------------------------------------
   * 7. Return public authentication result.
   *
   * Never expose:
   * - passwordHash
   * - refreshTokenHash
   * - internal session document
   * --------------------------------------------------
   */

  return {
    user: {
      id:
        user._id.toString(),

      email:
        user.email,

      status:
        user.status,

      emailVerified:
        user.emailVerified,

      createdAt:
        user.createdAt,

      updatedAt:
        user.updatedAt,
    },

    tokens: {
      accessToken,

      refreshToken,

      expiresIn: 15 * 60,
    },
  };
}