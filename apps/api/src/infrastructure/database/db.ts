import type {
  Collection,
  Db,
  Document,
} from "mongodb";

let database: Db | null = null;

export function setDatabase(
  db: Db,
): void {
  database = db;
}

export function getDatabase(): Db {
  if (!database) {
    throw new Error(
      "MongoDB database has not been initialized.",
    );
  }

  return database;
}

export function getCollection<
  T extends Document,
>(
  name: string,
): Collection<T> {
  return getDatabase().collection<T>(
    name,
  );
}