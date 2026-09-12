import { createHash, randomBytes } from "node:crypto";

const ANONYMOUS_SECRET_BYTES = 32;

export function generateAnonymousSecret(): string {
  return randomBytes(ANONYMOUS_SECRET_BYTES).toString("base64url");
}

export function hashAnonymousSecret(
  anonymousSecret: string,
): string {
  return createHash("sha256")
    .update(anonymousSecret, "utf8")
    .digest("hex");
}

export function verifyAnonymousSecret(
  anonymousSecret: string,
  anonymousSecretHash: string,
): boolean {
  return hashAnonymousSecret(anonymousSecret) === anonymousSecretHash;
}