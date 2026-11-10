
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
  getDatabase,
  setDatabase,
} from "../../../infrastructure/database/db.js";

import {
  NOTIFICATION_CHANNEL,
  NOTIFICATION_STATUS,
  type NotificationDocument,
} from "../types/notification.types.js";

import {
  createNotification,
  findNotificationByEscalationId,
  ensureNotificationIndexes,
  claimNextNotification,
  completeNotificationDelivery,
  retryNotificationDelivery,
  deadLetterNotification,
  deadLetterExhaustedNotifications,
} from "./notification.repository.js";

const integrationEnabled =
  process.env.MONGODB_INTEGRATION_TESTS === "true";

const integrationDescribe = describe.skipIf(!integrationEnabled);

let mongoClient: MongoClient | null = null;

const createdIds: ObjectId[] = [];

function createTestNotification(
  overrides: Partial<NotificationDocument> = {},
): NotificationDocument {
  const now = new Date();

  return {
    escalationId: new ObjectId(),
    safetyEventId: new ObjectId(),
    caseId: new ObjectId(),
    channel: NOTIFICATION_CHANNEL.EMAIL,
    recipients: ["clinician-test@example.com"],
    subject: "Integration test notification",
    text: "Test notification content",
    delivery: {
      status: NOTIFICATION_STATUS.PENDING,
      attempts: 0,
      nextAttemptAt: now,
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

async function insertTestNotification(
  notification: NotificationDocument,
): Promise<NotificationDocument> {
  const created = await createNotification(notification);

  if (!created._id) {
    throw new Error("Created notification is missing its ID.");
  }

  createdIds.push(created._id);

  return created;
}

integrationDescribe(
  "notification repository MongoDB integration",
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
      if (createdIds.length > 0) {
        await getDatabase()
          .collection("notifications")
          .deleteMany({
            _id: { $in: [...createdIds] },
          });

        createdIds.length = 0;
      }
    });

    afterAll(async () => {
      if (mongoClient) {
        await mongoClient.close();
        mongoClient = null;
      }
    });

    it("creates and retrieves a notification by escalation ID", async () => {
      const notification = createTestNotification();

      const created =
        await insertTestNotification(notification);

      expect(created._id).toBeInstanceOf(ObjectId);

      const found =
        await findNotificationByEscalationId(
          notification.escalationId,
        );

      expect(found).not.toBeNull();

      expect(found?._id).toEqual(created._id);

      expect(found?.escalationId).toEqual(
        notification.escalationId,
      );

      expect(found?.delivery.status).toBe(
        NOTIFICATION_STATUS.PENDING,
      );
    });

    it("prevents duplicate notifications for the same escalation", async () => {
      const escalationId = new ObjectId();

      const first = createTestNotification({
        escalationId,
      });

      await insertTestNotification(first);

      const duplicate = createTestNotification({
        escalationId,
      });

      await expect(
        createNotification(duplicate),
      ).rejects.toMatchObject({
        code: 11000,
      });
    });

    it("allows only one worker to claim a notification", async () => {
      const notification = createTestNotification();

      await insertTestNotification(notification);

      const now = new Date();

      const results = await Promise.all([
        claimNextNotification(
          now,
          120_000,
          8,
        ),
        claimNextNotification(
          now,
          120_000,
          8,
        ),
      ]);

      const successfulClaims = results.filter(
        (result) => result !== null,
      );

      expect(successfulClaims).toHaveLength(1);

      const claimed = successfulClaims[0];

      expect(claimed?.delivery.status).toBe(
        NOTIFICATION_STATUS.PROCESSING,
      );

      expect(claimed?.delivery.attempts).toBe(1);

      expect(claimed?.delivery.leaseToken).toBeTruthy();
    });

    it("completes delivery with the correct lease token", async () => {
      await insertTestNotification(
        createTestNotification(),
      );

      const now = new Date();

      const claimed = await claimNextNotification(
        now,
        120_000,
        8,
      );

      expect(claimed?._id).toBeInstanceOf(ObjectId);

      if (!claimed?._id || !claimed.delivery.leaseToken) {
        throw new Error("Notification claim failed.");
      }

      const completed = await completeNotificationDelivery(
        claimed._id,
        claimed.delivery.leaseToken,
        new Date(),
      );

      expect(completed).toBe(true);

      const stored = await getDatabase()
        .collection<NotificationDocument>("notifications")
        .findOne({
          _id: claimed._id,
        });

      expect(stored?.delivery.status).toBe(
        NOTIFICATION_STATUS.DELIVERED,
      );

      expect(stored?.delivery.deliveredAt).toBeInstanceOf(Date);

      expect(stored?.delivery.leaseToken).toBeUndefined();
    });

    it("rejects completion with an invalid lease token", async () => {
      await insertTestNotification(
        createTestNotification(),
      );

      const now = new Date();

      const claimed = await claimNextNotification(
        now,
        120_000,
        8,
      );

      expect(claimed?._id).toBeInstanceOf(ObjectId);

      if (!claimed?._id) {
        throw new Error("Notification claim failed.");
      }

      const completed = await completeNotificationDelivery(
        claimed._id,
        "invalid-lease-token",
        new Date(),
      );

      expect(completed).toBe(false);
    });

    it("rejects completion after the lease expires", async () => {
      await insertTestNotification(
        createTestNotification(),
      );

      const now = new Date();

      const claimed = await claimNextNotification(
        now,
        1_000,
        8,
      );

      expect(claimed?._id).toBeInstanceOf(ObjectId);

      if (!claimed?._id || !claimed.delivery.leaseToken) {
        throw new Error("Notification claim failed.");
      }

      const afterExpiry = new Date(
        now.getTime() + 2_000,
      );

      const completed = await completeNotificationDelivery(
        claimed._id,
        claimed.delivery.leaseToken,
        afterExpiry,
      );

      expect(completed).toBe(false);
    });

    it("reschedules a notification for retry", async () => {
      await insertTestNotification(
        createTestNotification(),
      );

      const now = new Date();

      const claimed = await claimNextNotification(
        now,
        120_000,
        8,
      );

      if (!claimed?._id || !claimed.delivery.leaseToken) {
        throw new Error("Notification claim failed.");
      }

      const nextAttemptAt = new Date(
        now.getTime() + 60_000,
      );

      const retried = await retryNotificationDelivery(
        claimed._id,
        claimed.delivery.leaseToken,
        nextAttemptAt,
        "SMTPError",
        new Date(),
      );

      expect(retried).toBe(true);

      const stored = await getDatabase()
        .collection<NotificationDocument>("notifications")
        .findOne({
          _id: claimed._id,
        });

      expect(stored?.delivery.status).toBe(
        NOTIFICATION_STATUS.PENDING,
      );

      expect(stored?.delivery.nextAttemptAt).toEqual(
        nextAttemptAt,
      );

      expect(stored?.delivery.lastErrorName).toBe(
        "SMTPError",
      );

      expect(stored?.delivery.leaseToken).toBeUndefined();
    });

    it("moves a notification to dead-letter", async () => {
      await insertTestNotification(
        createTestNotification(),
      );

      const now = new Date();

      const claimed = await claimNextNotification(
        now,
        120_000,
        8,
      );

      if (!claimed?._id || !claimed.delivery.leaseToken) {
        throw new Error("Notification claim failed.");
      }

      const deadLettered = await deadLetterNotification(
        claimed._id,
        claimed.delivery.leaseToken,
        "PermanentSMTPFailure",
        new Date(),
      );

      expect(deadLettered).toBe(true);

      const stored = await getDatabase()
        .collection<NotificationDocument>("notifications")
        .findOne({
          _id: claimed._id,
        });

      expect(stored?.delivery.status).toBe(
        NOTIFICATION_STATUS.DEAD_LETTER,
      );

      expect(stored?.delivery.lastErrorName).toBe(
        "PermanentSMTPFailure",
      );

      expect(stored?.delivery.leaseToken).toBeUndefined();
    });

    it("dead-letters exhausted notifications with expired leases", async () => {
      const now = new Date();

      const notification = createTestNotification({
        delivery: {
          status: NOTIFICATION_STATUS.PROCESSING,
          attempts: 8,
          nextAttemptAt: new Date(
            now.getTime() - 60_000,
          ),
          leaseUntil: new Date(
            now.getTime() - 1_000,
          ),
          leaseToken: "expired-test-token",
          updatedAt: now,
        },
      });

      const created =
        await insertTestNotification(notification);

      const count = await deadLetterExhaustedNotifications(
        8,
        now,
      );

      expect(count).toBe(1);

if (!created._id) {
  throw new Error("Created notification is missing its ID.");
}

const stored = await getDatabase()
  .collection<NotificationDocument>("notifications")
  .findOne({
    _id: created._id,
  });
      expect(stored?.delivery.status).toBe(
        NOTIFICATION_STATUS.DEAD_LETTER,
      );

      expect(stored?.delivery.lastErrorName).toBe(
        "MAX_RETRY_ATTEMPTS_EXCEEDED",
      );

      expect(stored?.delivery.leaseToken).toBeUndefined();
    });
  },
);
