import type {
  Db,
} from "mongodb";

const USERS_COLLECTION =
  "users";

const EMAIL_INDEX_NAME =
  "users_email_unique";

export async function ensureUserIndexes(
  db: Db,
): Promise<void> {
  const usersCollection =
    db.collection(USERS_COLLECTION);

  await usersCollection.createIndex(
    {
      email: 1,
    },
    {
      name: EMAIL_INDEX_NAME,
      unique: true,
    },
  );
}