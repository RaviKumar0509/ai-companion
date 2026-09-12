import type {
  Collection,
  InsertOneResult,
  ObjectId,
  ClientSession,
} from "mongodb";

import {
  ConflictError,
} from "../../../shared/errors/index.js";

import {
  getCollection,
} from "../../../infrastructure/database/db.js";

import type {
  UserDocument,
} from "../types/user.types.js";

const USERS_COLLECTION = "users";

function getUserCollection(): Collection<UserDocument> {
  return getCollection<UserDocument>(
    USERS_COLLECTION,
  );
}

export async function findUserByEmail(
  email: string,
): Promise<UserDocument | null> {
  return getUserCollection().findOne({
    email,
  });
}

export async function findUserById(
  userId: ObjectId,
  mongoSession?: ClientSession,
): Promise<UserDocument | null> {
  return mongoSession !== undefined
    ? getUserCollection().findOne(
        {
          _id: userId,
        },
        {
          session: mongoSession,
        },
      )
    : getUserCollection().findOne({
        _id: userId,
      });
}

export async function updateUserPassword(
  userId: ObjectId,
  passwordHash: string,
  updatedAt: Date,
  mongoSession?: ClientSession,
): Promise<boolean> {
  const collection =
    getUserCollection();

  const result =
    mongoSession !== undefined
      ? await collection.updateOne(
          {
            _id: userId,
          },
          {
            $set: {
              passwordHash,
              updatedAt,
            },
          },
          {
            session: mongoSession,
          },
        )
      : await collection.updateOne(
          {
            _id: userId,
          },
          {
            $set: {
              passwordHash,
              updatedAt,
            },
          },
        );

  return result.modifiedCount === 1;
}


export async function updateUserEmailVerified(
  userId: ObjectId,
  verifiedAt: Date,
  mongoSession?: ClientSession,
): Promise<boolean> {
  const collection =
    getUserCollection();

  const result =
    mongoSession !== undefined
      ? await collection.updateOne(
          {
            _id: userId,
            emailVerified: false,
          },
          {
            $set: {
              emailVerified: true,
              updatedAt: verifiedAt,
            },
          },
          {
            session: mongoSession,
          },
        )
      : await collection.updateOne(
          {
            _id: userId,
            emailVerified: false,
          },
          {
            $set: {
              emailVerified: true,
              updatedAt: verifiedAt,
            },
          },
        );

  return result.modifiedCount === 1;
}


export async function createUser(
  user: UserDocument,
): Promise<UserDocument> {
  try {
    const result: InsertOneResult<UserDocument> =
      await getUserCollection().insertOne(user);

    if (!result.acknowledged) {
      throw new Error(
        "User creation was not acknowledged by MongoDB.",
      );
    }

    return user;
  } catch (error: unknown) {
    if (isMongoDuplicateKeyError(error)) {
      throw new ConflictError(
        "An account with this email already exists.",
      );
    }

    throw error;
  }
}

function isMongoDuplicateKeyError(
  error: unknown,
): boolean {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return false;
  }

  if (
    "code" in error &&
    typeof error.code === "number"
  ) {
    return error.code === 11000;
  }

  return false;
}