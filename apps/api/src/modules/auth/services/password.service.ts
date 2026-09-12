import argon2 from "argon2";

const PASSWORD_HASH_OPTIONS = {
  type: 2,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
} as const;

export async function hashPassword(
  password: string,
): Promise<string> {
  return argon2.hash(
    password,
    PASSWORD_HASH_OPTIONS,
  );
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return argon2.verify(
    passwordHash,
    password,
  );
}