import {
  logger,
} from "../logger/logger.js";

import {
  getDatabase,
} from "./db.js";

export async function ensureIndexes(): Promise<void> {
  const db =
    getDatabase();

  logger.info(
    "STEP 4 → Creating database indexes",
  );

  /*
   * --------------------------------------------------
   * USERS
   * --------------------------------------------------
   */

  await db
    .collection("users")
    .createIndex(
      { email: 1 },
      {
        unique: true,
        name: "users_email_unique",
      },
    );

  /*
   * --------------------------------------------------
   * AUTH SESSIONS
   * --------------------------------------------------
   */

  await db
    .collection("auth_sessions")
    .createIndex(
      { sessionId: 1 },
      {
        unique: true,
        name: "auth_sessions_session_id_unique",
      },
    );

  await db
    .collection("auth_sessions")
    .createIndex(
      { tokenFamilyId: 1 },
      {
        name: "auth_sessions_token_family",
      },
    );

  await db
    .collection("auth_sessions")
    .createIndex(
      {
        userId: 1,
        status: 1,
      },
      {
        name: "auth_sessions_user_status",
      },
    );


    await db
  .collection("auth_refresh_tokens")
  .createIndex(
    { tokenHash: 1 },
    {
      unique: true,
      name: "auth_refresh_tokens_hash_unique",
    },
  );

await db
  .collection("auth_refresh_tokens")
  .createIndex(
    {
      sessionId: 1,
      version: 1,
    },
    {
      unique: true,
      name: "auth_refresh_tokens_session_version_unique",
    },
  );

await db
  .collection("auth_refresh_tokens")
  .createIndex(
    { tokenFamilyId: 1 },
    {
      name: "auth_refresh_tokens_family",
    },
  );

await db
  .collection("auth_refresh_tokens")
  .createIndex(
    { expiresAt: 1 },
    {
      expireAfterSeconds: 0,
      name: "auth_refresh_tokens_expiration",
    },
  );

  /*
   * --------------------------------------------------
   * TTL CLEANUP
   *
   * MongoDB removes expired session documents.
   *
   * IMPORTANT:
   * TTL is cleanup only.
   * Authentication logic must still explicitly
   * check status and expiresAt.
   * --------------------------------------------------
   */

  await db
    .collection("auth_sessions")
    .createIndex(
      { expiresAt: 1 },
      {
        expireAfterSeconds: 0,
        name: "auth_sessions_expiration",
      },
    );

  logger.info(
    "STEP 4 SUCCESS → Database indexes verified",
  );
}