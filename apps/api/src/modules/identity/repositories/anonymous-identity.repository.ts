import type {
  Collection,
  InsertOneResult,
  ObjectId,
  UpdateResult,
} from "mongodb";

import { getCollection } from "../../../infrastructure/database/db.js";

import type {
  AnonymousIdentityDocument,
} from "../types/anonymous-identity.types.js";

const ANONYMOUS_IDENTITIES_COLLECTION = "anonymousIdentities";

function getAnonymousIdentityCollection(): Collection<AnonymousIdentityDocument> {
  return getCollection<AnonymousIdentityDocument>(
    ANONYMOUS_IDENTITIES_COLLECTION,
  );
}

export async function createAnonymousIdentity(
  identity: AnonymousIdentityDocument,
): Promise<AnonymousIdentityDocument> {
  const result: InsertOneResult<AnonymousIdentityDocument> =
    await getAnonymousIdentityCollection().insertOne(identity);

  if (!result.acknowledged) {
    throw new Error(
      "Anonymous identity creation was not acknowledged by MongoDB.",
    );
  }

  return {
    ...identity,
    _id: result.insertedId,
  };
}

export async function findAnonymousIdentityById(
  anonymousId: string,
): Promise<AnonymousIdentityDocument | null> {
  return getAnonymousIdentityCollection().findOne({
    anonymousId,
  });
}

export async function findAnonymousIdentityByDeviceId(
  deviceId: string,
): Promise<AnonymousIdentityDocument | null> {
  return getAnonymousIdentityCollection().findOne({
    deviceId,
  });
}

export async function updateAnonymousIdentityLastSeen(
  anonymousId: string,
  lastSeenAt: Date,
): Promise<boolean> {
  const result: UpdateResult<AnonymousIdentityDocument> =
    await getAnonymousIdentityCollection().updateOne(
      {
        anonymousId,
        status: "active",
      },
      {
        $set: {
          lastSeenAt,
        },
      },
    );

  return result.modifiedCount === 1;
}

export async function convertAnonymousIdentity(
  anonymousId: string,
  userId: ObjectId,
  convertedAt: Date,
): Promise<boolean> {
  const result: UpdateResult<AnonymousIdentityDocument> =
    await getAnonymousIdentityCollection().updateOne(
      {
        anonymousId,
        status: "active",
      },
      {
        $set: {
          status: "revoked",
          convertedToUserId: userId,
          convertedAt,
          lastSeenAt: convertedAt,
        },
      },
    );

  return result.modifiedCount === 1;
}