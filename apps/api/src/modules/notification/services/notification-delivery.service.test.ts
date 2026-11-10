
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

import { processPendingNotifications } from "./notification-delivery.service.js";

import {
  NOTIFICATION_CHANNEL,
  NOTIFICATION_STATUS,
  type NotificationDocument,
} from "../types/notification.types.js";

const mocks = vi.hoisted(() => ({
  sendMail: vi.fn(),

  claimNextNotification: vi.fn(),
  completeNotificationDelivery: vi.fn(),
  retryNotificationDelivery: vi.fn(),
  deadLetterNotification: vi.fn(),
  deadLetterExhaustedNotifications: vi.fn(),
}));

vi.mock(
  "../../../infrastructure/notifications/mail/mail.client.js",
  () => ({
    sendMail: mocks.sendMail,
  }),
);

vi.mock("../repositories/notification.repository.js", () => ({
  claimNextNotification: mocks.claimNextNotification,
  completeNotificationDelivery:
    mocks.completeNotificationDelivery,
  retryNotificationDelivery:
    mocks.retryNotificationDelivery,
  deadLetterNotification: mocks.deadLetterNotification,
  deadLetterExhaustedNotifications:
    mocks.deadLetterExhaustedNotifications,
}));

const notificationId = new ObjectId();
const escalationId = new ObjectId();
const safetyEventId = new ObjectId();
const caseId = new ObjectId();

function createNotification(
  attempts = 1,
  recipients = [
    "clinician1@example.com",
    "clinician2@example.com",
  ],
): NotificationDocument {
  const now = new Date();

  return {
    _id: notificationId,
    escalationId,
    safetyEventId,
    caseId,
    channel: NOTIFICATION_CHANNEL.EMAIL,
    recipients,
    subject: "High-risk safety escalation",
    text: "A high-risk safety escalation requires attention.",
    delivery: {
      status: NOTIFICATION_STATUS.PROCESSING,
      attempts,
      nextAttemptAt: now,
      leaseUntil: new Date(now.getTime() + 120_000),
      leaseToken: "test-notification-lease",
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function mockClaimedNotification(
  notification: NotificationDocument,
): void {
  mocks.claimNextNotification
    .mockResolvedValueOnce(notification)
    .mockResolvedValue(null);
}

describe("notification delivery service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.claimNextNotification.mockResolvedValue(null);

    mocks.sendMail.mockResolvedValue(undefined);

    mocks.completeNotificationDelivery.mockResolvedValue(true);

    mocks.retryNotificationDelivery.mockResolvedValue(true);

    mocks.deadLetterNotification.mockResolvedValue(true);

    mocks.deadLetterExhaustedNotifications.mockResolvedValue(0);
  });

  it("sends email and marks notification as delivered", async () => {
    const notification = createNotification();

    mockClaimedNotification(notification);

    const processedCount =
      await processPendingNotifications();

    expect(processedCount).toBe(1);

    expect(mocks.sendMail).toHaveBeenCalledTimes(1);

    expect(mocks.sendMail).toHaveBeenCalledWith({
      to: "clinician1@example.com",
      bcc: ["clinician2@example.com"],
      subject: "High-risk safety escalation",
      text: "A high-risk safety escalation requires attention.",
    });

    expect(
      mocks.completeNotificationDelivery,
    ).toHaveBeenCalledWith(
      notificationId,
      "test-notification-lease",
      expect.any(Date),
    );

    expect(mocks.retryNotificationDelivery).not.toHaveBeenCalled();

    expect(mocks.deadLetterNotification).not.toHaveBeenCalled();
  });

  it("schedules a retry when email delivery fails", async () => {
    const notification = createNotification();

    mockClaimedNotification(notification);

    mocks.sendMail.mockRejectedValueOnce(
      new Error("SMTPUnavailable"),
    );

    const processedCount =
      await processPendingNotifications();

    expect(processedCount).toBe(1);

    expect(mocks.sendMail).toHaveBeenCalledTimes(1);

    expect(mocks.completeNotificationDelivery).not.toHaveBeenCalled();

    expect(mocks.retryNotificationDelivery).toHaveBeenCalledWith(
      notificationId,
      "test-notification-lease",
      expect.any(Date),
      "Error",
      expect.any(Date),
    );

    expect(mocks.deadLetterNotification).not.toHaveBeenCalled();
  });

  it("moves notification to dead-letter after maximum attempts", async () => {
    const notification = createNotification(8);

    mockClaimedNotification(notification);

    mocks.sendMail.mockRejectedValueOnce(
      new Error("PermanentSMTPFailure"),
    );

    const processedCount =
      await processPendingNotifications();

    expect(processedCount).toBe(1);

    expect(mocks.deadLetterNotification).toHaveBeenCalledWith(
      notificationId,
      "test-notification-lease",
      "Error",
      expect.any(Date),
    );

    expect(mocks.retryNotificationDelivery).not.toHaveBeenCalled();

    expect(mocks.completeNotificationDelivery).not.toHaveBeenCalled();
  });

  it("does not mark notification delivered when lease ownership is lost", async () => {
    const notification = createNotification();

    mockClaimedNotification(notification);

    mocks.completeNotificationDelivery.mockResolvedValue(false);

    const processedCount =
      await processPendingNotifications();

    expect(processedCount).toBe(1);

    expect(mocks.sendMail).toHaveBeenCalledTimes(1);

    expect(
      mocks.completeNotificationDelivery,
    ).toHaveBeenCalledWith(
      notificationId,
      "test-notification-lease",
      expect.any(Date),
    );

    expect(mocks.retryNotificationDelivery).not.toHaveBeenCalled();

    expect(mocks.deadLetterNotification).not.toHaveBeenCalled();
  });

  it("schedules retry when no clinician recipients are configured", async () => {
    const notification = createNotification(1, []);

    mockClaimedNotification(notification);

    const processedCount =
      await processPendingNotifications();

    expect(processedCount).toBe(1);

    expect(mocks.sendMail).not.toHaveBeenCalled();

    expect(mocks.completeNotificationDelivery).not.toHaveBeenCalled();

    expect(mocks.retryNotificationDelivery).toHaveBeenCalledWith(
      notificationId,
      "test-notification-lease",
      expect.any(Date),
      "Error",
      expect.any(Date),
    );
  });
});
