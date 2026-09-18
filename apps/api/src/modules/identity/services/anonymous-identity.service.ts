import { randomUUID } from "node:crypto";

import {
  ANONYMOUS_IDENTITY_STATUS,
  type AnonymousIdentityDocument,
} from "../types/anonymous-identity.types.js";

import {
  createAnonymousIdentity,
  findAnonymousIdentityById,
  updateAnonymousIdentityLastSeen,
} from "../repositories/anonymous-identity.repository.js";

import {
  generateAnonymousSecret,
  hashAnonymousSecret,
} from "./anonymous-credential.service.js";

import { IDENTITY_CONSTANTS } from "../constants/identity.constants.js";
import { verifyAnonymousSecret } from "./anonymous-credential.service.js";
import {
  revokeAnonymousIdentity,
} from "../repositories/anonymous-identity.repository.js";

export interface CreatedAnonymousIdentity {
  identity: AnonymousIdentityDocument;
  anonymousSecret: string;
}

function calculateExpiryDate(createdAt: Date): Date {
  return new Date(
    createdAt.getTime() +
      IDENTITY_CONSTANTS.ANONYMOUS.EXPIRY_DAYS *
        24 *
        60 *
        60 *
        1000,
  );
}

export async function createAnonymousIdentityForDevice(
  deviceId: string,
): Promise<CreatedAnonymousIdentity> {
  const now = new Date();
  const anonymousSecret = generateAnonymousSecret();

  const identity: AnonymousIdentityDocument = {
    anonymousId: randomUUID(),
    anonymousSecretHash: hashAnonymousSecret(anonymousSecret),
    status: ANONYMOUS_IDENTITY_STATUS.ACTIVE,
    deviceId,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: calculateExpiryDate(now),
  };

  const createdIdentity = await createAnonymousIdentity(identity);

  return {
    identity: createdIdentity,
    anonymousSecret,
  };
}

export async function resolveAnonymousIdentity(
  anonymousId: string,
): Promise<AnonymousIdentityDocument | null> {
  const identity = await findAnonymousIdentityById(anonymousId);

  if (!identity) {
    return null;
  }

  const now = new Date();

  if (
    identity.status !== ANONYMOUS_IDENTITY_STATUS.ACTIVE ||
    identity.expiresAt.getTime() <= now.getTime()
  ) {
    return null;
  }

  await updateAnonymousIdentityLastSeen(
    identity.anonymousId,
    now,
  );

  return {
    ...identity,
    lastSeenAt: now,
  };

  
}

export async function revokeAnonymousIdentityForLogout(
  anonymousId: string,
): Promise<boolean> {
  const revokedAt = new Date();

  return revokeAnonymousIdentity(
    anonymousId,
    revokedAt,
  );
}

export async function authenticateAnonymousIdentity(
  anonymousId: string,
  anonymousSecret: string,
): Promise<AnonymousIdentityDocument | null> {
  const identity = await findAnonymousIdentityById(anonymousId);

  if (!identity) {
    return null;
  }

  const now = new Date();

  if (
    identity.status !== ANONYMOUS_IDENTITY_STATUS.ACTIVE ||
    identity.expiresAt.getTime() <= now.getTime()
  ) {
    return null;
  }

  const validSecret = verifyAnonymousSecret(
    anonymousSecret,
    identity.anonymousSecretHash,
  );

  if (!validSecret) {
    return null;
  }

  

  await updateAnonymousIdentityLastSeen(
    identity.anonymousId,
    now,
  );

  return {
    ...identity,
    lastSeenAt: now,
  };
}