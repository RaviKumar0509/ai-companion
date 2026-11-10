import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MongoClient, ObjectId } from "mongodb";

import { env } from "../../../config/env.js";
import { setDatabase } from "../../../infrastructure/database/db.js";

import {
  SAFETY_EVENT_INDEXES,
} from "../../safety/repositories/safety.indexes.js";

import {
  ESCALATION_INDEXES,
} from "../../safety/repositories/escalation.indexes.js";

import {
  NOTIFICATION_INDEXES,
} from "../repositories/notification.indexes.js";

import {
  persistSafetyEvent,
} from "../../safety/services/safety-event.service.js";

import {
  processSafetyEventEscalationNow,
} from "../../safety/services/escalation.service.js";

import {
  processNotificationById,
} from "./notification-delivery.service.js";

import {
  SAFETY_ACTION,
  SAFETY_CATEGORY,
  SAFETY_RISK_LEVEL,
  type SafetyResult,
} from "../../safety/types/safety.types.js";

import {
  NOTIFICATION_STATUS,
} from "../types/notification.types.js";

// --------------------------------------------------
// MOCK EMAIL TRANSPORT
// --------------------------------------------------

const { sendMailMock } = vi.hoisted(() => ({
  sendMailMock: vi.fn(),
}));

vi.mock(
  "../../../infrastructure/notifications/mail/mail.client.js",
  () => ({
    sendMail: sendMailMock,
  }),
);

// --------------------------------------------------
// INTEGRATION TEST CONFIGURATION
// --------------------------------------------------

const integrationEnabled =
  process.env.MONGODB_INTEGRATION_TESTS === "true";

const describeIntegration =
  describe.skipIf(!integrationEnabled);

const TEST_DATABASE_NAME = "ai-companion-platform-test";

let mongoClient: MongoClient;
let testDatabase: ReturnType<MongoClient["db"]>;

let safetyEventId: ObjectId | null = null;

// --------------------------------------------------
// DATABASE SETUP
// --------------------------------------------------

describeIntegration(
  "Safety escalation and notification workflow integration",
  () => {
    beforeAll(async () => {
      const username = encodeURIComponent(
        env.MONGODB_USERNAME,
      );

      const password = encodeURIComponent(
        env.MONGODB_PASSWORD,
      );

      const mongoUri =
        `mongodb+srv://${username}:${password}@${env.MONGODB_HOST}/?retryWrites=true&w=majority`;

      mongoClient = new MongoClient(mongoUri, {
        serverSelectionTimeoutMS: 10_000,
      });

      await mongoClient.connect();

      testDatabase = mongoClient.db(
        TEST_DATABASE_NAME,
      );

      setDatabase(testDatabase);

      // Create only the indexes required by this workflow.
      await testDatabase
        .collection("safety_events")
        .createIndexes([...SAFETY_EVENT_INDEXES]);

      await testDatabase
        .collection("escalations")
        .createIndexes([...ESCALATION_INDEXES]);

      await testDatabase
        .collection("notifications")
        .createIndexes([...NOTIFICATION_INDEXES]);
    });

    afterAll(async () => {
      if (mongoClient) {
        await mongoClient.close();
      }
    });

    beforeEach(() => {
      safetyEventId = null;
      vi.clearAllMocks();

      sendMailMock.mockResolvedValue(undefined);
    });

    afterEach(async () => {
      if (!safetyEventId) {
        return;
      }

      // Delete dependent records first.
      await testDatabase
        .collection("notifications")
        .deleteMany({
          safetyEventId,
        });

      await testDatabase
        .collection("escalations")
        .deleteMany({
          safetyEventId,
        });

      await testDatabase
        .collection("safety_events")
        .deleteOne({
          _id: safetyEventId,
        });

      safetyEventId = null;
    });

    // --------------------------------------------------
    // END-TO-END BUSINESS WORKFLOW
    // --------------------------------------------------

    it(
      "should persist a crisis event, create an escalation, create a notification and deliver the email",
      async () => {
        // STEP 1: Create a high-risk crisis safety event.

        const safetyResult: SafetyResult = {
          riskLevel: SAFETY_RISK_LEVEL.HIGH,
          category: SAFETY_CATEGORY.SELF_HARM,
          action: SAFETY_ACTION.CRISIS,
        };

        const safetyEvent = await persistSafetyEvent({
          conversationId: new ObjectId(),
          caseId: new ObjectId(),
          ownerType: "user",
          userId: new ObjectId(),
          safetyResult,
        });

        if (!safetyEvent._id) {
          throw new Error(
            "Safety event was created without an ID.",
          );
        }

        safetyEventId = safetyEvent._id;

        // Verify that recovery was scheduled.

        expect(
          safetyEvent.escalationRecovery?.status,
        ).toBe("pending");

        // STEP 2: Process the safety event.
        // This creates the escalation and notification.

        const escalation =
          await processSafetyEventEscalationNow(
            safetyEvent._id,
          );

        expect(escalation).not.toBeNull();
        expect(escalation?._id).toBeDefined();

        // STEP 3: Verify escalation persistence.

        const storedEscalation =
          await testDatabase
            .collection("escalations")
            .findOne({
              safetyEventId: safetyEvent._id,
            });

        expect(storedEscalation).not.toBeNull();
        expect(storedEscalation?.status).toBe("open");

        // STEP 4: Verify notification persistence.

        const storedNotification =
          await testDatabase
            .collection("notifications")
            .findOne({
              escalationId: escalation?._id,
            });

        expect(storedNotification).not.toBeNull();

        expect(
          storedNotification?.delivery.status,
        ).toBe(NOTIFICATION_STATUS.PENDING);

        // STEP 5: Verify safety escalation recovery completed.

        const completedSafetyEvent =
          await testDatabase
            .collection("safety_events")
            .findOne({
              _id: safetyEvent._id,
            });

        expect(
          completedSafetyEvent?.escalationRecovery?.status,
        ).toBe("completed");

        // STEP 6: Process pending notification delivery.
        // The email transport is mocked, so no real email is sent.

if (!storedNotification?._id) {
  throw new Error(
    "Persisted notification is missing its ID.",
  );
}

const processed =
  await processNotificationById(
    storedNotification._id,
  );

expect(processed).toBe(true);

        expect(sendMailMock).toHaveBeenCalledTimes(1);

        // STEP 7: Verify email delivery state was persisted.

        const deliveredNotification =
          await testDatabase
            .collection("notifications")
            .findOne({
              escalationId: escalation?._id,
            });

        expect(
          deliveredNotification?.delivery.status,
        ).toBe(NOTIFICATION_STATUS.DELIVERED);

        expect(
          deliveredNotification?.delivery.deliveredAt,
        ).toBeInstanceOf(Date);
      },
    );
  },
);