
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import {
  MongoClient,
  ObjectId,
} from "mongodb";

import { env } from "../../../config/env.js";

import {
  setDatabase,
  getDatabase,
} from "../../../infrastructure/database/db.js";

import type { EscalationDocument } from "../../safety/types/escalation.types.js";

import {
  NOTIFICATION_CHANNEL,
  NOTIFICATION_STATUS,
  type NotificationDocument,
} from "../types/notification.types.js";

import {
  ensureNotificationIndexes,
} from "../repositories/notification.repository.js";

import {
  createNotificationForEscalation,
} from "./notification.service.js";

const integrationEnabled =
  process.env.MONGODB_INTEGRATION_TESTS === "true";

const integrationDescribe = describe.skipIf(!integrationEnabled);

let mongoClient: MongoClient | null = null;

const createdEscalationIds: ObjectId[] = [];

function createTestEscalation(): EscalationDocument {
  const now = new Date();

  return {
    _id: new ObjectId(),
    safetyEventId: new ObjectId(),
    caseId: new ObjectId(),
    conversationId: new ObjectId(),
    ownerType: "user",
    riskLevel: "high",
    category: "self_harm",
    status: "open",
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

integrationDescribe(
  "notification service MongoDB integration",
  () => {
    beforeAll(async () => {
      if (
        !env.MONGODB_USERNAME ||
        !env.MONGODB_PASSWORD ||
        !env.MONGODB_HOST
      ) {
        throw new Error(
          "MongoDB integration test configuration is missing.",
        );
      }

      const username = encodeURIComponent(
        env.MONGODB_USERNAME,
      );

      const password = encodeURIComponent(
        env.MONGODB_PASSWORD,
      );

      const uri =
        `mongodb+srv://${username}:${password}` +
        `@${env.MONGODB_HOST}/?retryWrites=true&w=majority`;

      mongoClient = new MongoClient(uri);

      await mongoClient.connect();

      const testDatabase = mongoClient.db(
        "ai-companion-platform-test",
      );

      await testDatabase.command({ ping: 1 });

      setDatabase(testDatabase);

      await ensureNotificationIndexes();
    });

    afterEach(async () => {
      if (createdEscalationIds.length > 0) {
        await getDatabase()
          .collection<NotificationDocument>("notifications")
          .deleteMany({
            escalationId: {
              $in: [...createdEscalationIds],
            },
          });

        createdEscalationIds.length = 0;
      }
    });

    afterAll(async () => {
      if (mongoClient) {
        await mongoClient.close();
        mongoClient = null;
      }
    });

    it("creates a notification for a high-risk escalation", async () => {
      const escalation = createTestEscalation();

      if (!escalation._id) {
        throw new Error("Test escalation ID is missing.");
      }

      createdEscalationIds.push(escalation._id);

      const notification =
        await createNotificationForEscalation(escalation);

      expect(notification._id).toBeInstanceOf(ObjectId);

      expect(notification.escalationId).toEqual(
        escalation._id,
      );

      expect(notification.safetyEventId).toEqual(
        escalation.safetyEventId,
      );

      expect(notification.caseId).toEqual(
        escalation.caseId,
      );

      expect(notification.channel).toBe(
        NOTIFICATION_CHANNEL.EMAIL,
      );

      expect(notification.delivery.status).toBe(
        NOTIFICATION_STATUS.PENDING,
      );

      expect(notification.delivery.attempts).toBe(0);
    });

    it("uses configured and deduplicated clinician recipients", async () => {
      const escalation = createTestEscalation();

      if (!escalation._id) {
        throw new Error("Test escalation ID is missing.");
      }

      createdEscalationIds.push(escalation._id);

      const notification =
        await createNotificationForEscalation(escalation);

      expect(notification.recipients).toEqual([
        ...new Set(env.CLINICIAN_ALERT_EMAILS),
      ]);

      expect(notification.recipients.length).toBeGreaterThan(0);
    });

    it("returns the existing notification when called again", async () => {
      const escalation = createTestEscalation();

      if (!escalation._id) {
        throw new Error("Test escalation ID is missing.");
      }

      createdEscalationIds.push(escalation._id);

      const first =
        await createNotificationForEscalation(escalation);

      const second =
        await createNotificationForEscalation(escalation);

      expect(second._id).toEqual(first._id);

      const count = await getDatabase()
        .collection<NotificationDocument>("notifications")
        .countDocuments({
          escalationId: escalation._id,
        });

      expect(count).toBe(1);
    });

    it("handles concurrent notification creation without duplicates", async () => {
      const escalation = createTestEscalation();

      if (!escalation._id) {
        throw new Error("Test escalation ID is missing.");
      }

      createdEscalationIds.push(escalation._id);

      const results = await Promise.all([
        createNotificationForEscalation(escalation),
        createNotificationForEscalation(escalation),
      ]);

      expect(results).toHaveLength(2);

      expect(results[0]._id).toEqual(results[1]._id);

      const count = await getDatabase()
        .collection<NotificationDocument>("notifications")
        .countDocuments({
          escalationId: escalation._id,
        });

      expect(count).toBe(1);
    });

    it("rejects escalation without an ID", async () => {
      const escalation = createTestEscalation();

      const { _id: omittedId, ...escalationWithoutId } =
        escalation;

      void omittedId;

      await expect(
        createNotificationForEscalation(
          escalationWithoutId,
        ),
      ).rejects.toThrow(
        "Cannot create notification without an escalation ID.",
      );
    });
  },
);
