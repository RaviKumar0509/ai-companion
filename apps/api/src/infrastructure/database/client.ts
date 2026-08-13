import {
  MongoClient,
  type Db,
} from "mongodb";

import { env } from "../../config/env.js";
import { logger } from "../logger/logger.js";

const encodedUsername =
  encodeURIComponent(
    env.MONGODB_USERNAME,
  );

const encodedPassword =
  encodeURIComponent(
    env.MONGODB_PASSWORD,
  );

const mongoUri =
  `mongodb+srv://${encodedUsername}:${encodedPassword}` +
  `@${env.MONGODB_HOST}/` +
  `?retryWrites=true&w=majority&appName=ai-companion-platform`;

export const mongoClient =
  new MongoClient(mongoUri);

export async function connectDatabase(): Promise<Db> {
  logger.info(
    "STEP 1 → MongoDB connect()",
  );

  try {
    await mongoClient.connect();

    logger.info(
      "STEP 1 SUCCESS → MongoClient connected",
    );

    const database =
      mongoClient.db(
        env.MONGODB_DATABASE,
      );

    logger.info(
      {
        database:
          env.MONGODB_DATABASE,
      },
      "STEP 2 SUCCESS → Database selected",
    );

    logger.info(
      "STEP 3 → MongoDB ping()",
    );

    await database.command({
      ping: 1,
    });

    logger.info(
      "STEP 3 SUCCESS → MongoDB ping successful",
    );

    return database;
  } catch (error: unknown) {
    logger.error(
      {
        error,
      },
      "❌ DATABASE CONNECTION FAILED",
    );

    throw error;
  }
}