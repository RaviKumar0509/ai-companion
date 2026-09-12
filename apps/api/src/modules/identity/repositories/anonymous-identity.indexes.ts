import type { Collection, IndexDescription } from "mongodb";

import type { AnonymousIdentityDocument } from "../types/anonymous-identity.types.js";

export const ANONYMOUS_IDENTITY_INDEXES: IndexDescription[] = [
  {
    key: { anonymousId: 1 },
    name: "anonymous_identity_id_unique",
    unique: true,
  },
  {
    key: { deviceId: 1 },
    name: "anonymous_identity_device_id",
  },
  {
    key: { status: 1, expiresAt: 1 },
    name: "anonymous_identity_status_expires_at",
  },
  {
    key: { expiresAt: 1 },
    name: "anonymous_identity_expires_at_ttl",
    expireAfterSeconds: 0,
  },
  {
    key: { convertedToUserId: 1 },
    name: "anonymous_identity_converted_user",
    sparse: true,
  },
];

export async function ensureAnonymousIdentityIndexes(
  collection: Collection<AnonymousIdentityDocument>,
): Promise<void> {
  await collection.createIndexes(ANONYMOUS_IDENTITY_INDEXES);
}