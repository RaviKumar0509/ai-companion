
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  MongoClient,
  ObjectId,
  type Db,
} from "mongodb";

import { env } from "../../../config/env.js";
import { setDatabase } from "../../../infrastructure/database/db.js";

import {
  claimSafetyEventEscalationById,
  createSafetyEvent,
  ensureSafetyEventIndexes,
} from "./safety.repository.js";

import {
  ESCALATION_RECOVERY_STATUS,
  type SafetyEventDocument,
} from "../types/safety.types.js";

const TEST_DATABASE_NAME = "ai-companion-platform-test";

const integrationEnabled =
  process.env.MONGODB_INTEGRATION_TESTS === "true";

describe.skipIf(!integrationEnabled)(
  "MongoDB safety escalation concurrency",
  () => {
    let client: MongoClient;
    let database: Db;

    beforeAll(async () => {
      const username = encodeURIComponent(env.MONGODB_USERNAME);
      const password = encodeURIComponent(env.MONGODB_PASSWORD);

      const uri =
        `mongodb+srv://${username}:${password}` +
        `@${env.MONGODB_HOST}/` +
        `?retryWrites=true&w=majority&appName=ai-companion-platform-tests`;

      client = new MongoClient(uri);

      await client.connect();

      database = client.db(TEST_DATABASE_NAME);

      await database.command({ ping: 1 });

      setDatabase(database);

      await ensureSafetyEventIndexes();
    }, 30_000);

    afterAll(async () => {
      await client?.close();
    });

    it(
      "allows exactly one worker to claim the same safety event",
      async () => {
        const now = new Date();

        const event: SafetyEventDocument = {
          conversationId: new ObjectId(),
          caseId: new ObjectId(),
          ownerType: "user",
          userId: new ObjectId(),
          riskLevel: "high",
          category: "self_harm",
          action: "crisis",
          source: "message",
          createdAt: now,
          escalationRecovery: {
            status: ESCALATION_RECOVERY_STATUS.PENDING,
            attempts: 0,
            nextAttemptAt: new Date(now.getTime() - 1_000),
            updatedAt: now,
          },
        };

        const createdEvent = await createSafetyEvent(event);

        try {
          const leaseUntil = new Date(
            now.getTime() + 120_000,
          );

          const [workerA, workerB] = await Promise.all([
            claimSafetyEventEscalationById(
              createdEvent._id!,
              now,
              leaseUntil,
              8,
            ),
            claimSafetyEventEscalationById(
              createdEvent._id!,
              now,
              leaseUntil,
              8,
            ),
          ]);

          const successfulClaims = [workerA, workerB].filter(
            (result) => result !== null,
          );

          expect(successfulClaims).toHaveLength(1);

          expect(
            successfulClaims[0]?.escalationRecovery?.status,
          ).toBe(ESCALATION_RECOVERY_STATUS.PROCESSING);

          expect(
            successfulClaims[0]?.escalationRecovery?.leaseToken,
          ).toBeTruthy();

          expect(
            successfulClaims[0]?.escalationRecovery?.attempts,
          ).toBe(1);
        } finally {
  if (createdEvent._id) {
    await database.collection("safety_events").deleteOne({
      _id: createdEvent._id,
    });
  }
}
      },
      30_000,
    );
  },
);
