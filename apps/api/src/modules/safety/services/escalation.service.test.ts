
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

import { processSafetyEventEscalationNow } from "./escalation.service.js";

import type { SafetyEventDocument } from "../types/safety.types.js";
import {
  ESCALATION_STATUS,
  type EscalationDocument,
} from "../types/escalation.types.js";

const mocks = vi.hoisted(() => ({
  createEscalation: vi.fn(),
  findEscalationBySafetyEventId: vi.fn(),
  listEscalationsByStatus: vi.fn(),

  claimSafetyEventEscalationById: vi.fn(),
  claimNextSafetyEventEscalation: vi.fn(),
  completeSafetyEventEscalation: vi.fn(),
  retrySafetyEventEscalation: vi.fn(),
  deadLetterSafetyEventEscalation: vi.fn(),
  deadLetterExhaustedSafetyEscalations: vi.fn(),
}));

vi.mock("../repositories/escalation.repository.js", () => ({
  createEscalation: mocks.createEscalation,
  findEscalationBySafetyEventId:
    mocks.findEscalationBySafetyEventId,
  listEscalationsByStatus: mocks.listEscalationsByStatus,
}));

vi.mock("../repositories/safety.repository.js", () => ({
  claimSafetyEventEscalationById:
    mocks.claimSafetyEventEscalationById,
  claimNextSafetyEventEscalation:
    mocks.claimNextSafetyEventEscalation,
  completeSafetyEventEscalation:
    mocks.completeSafetyEventEscalation,
  retrySafetyEventEscalation:
    mocks.retrySafetyEventEscalation,
  deadLetterSafetyEventEscalation:
    mocks.deadLetterSafetyEventEscalation,
  deadLetterExhaustedSafetyEscalations:
    mocks.deadLetterExhaustedSafetyEscalations,
}));

const safetyEventId = new ObjectId();
const caseId = new ObjectId();
const conversationId = new ObjectId();

function createSafetyEvent(
  attempts = 1,
): SafetyEventDocument {
  const now = new Date();

  return {
    _id: safetyEventId,
    caseId,
    conversationId,
    ownerType: "user",
    riskLevel: "high",
    category: "self_harm",
    action: "crisis",
    source: "message",
    createdAt: now,
    escalationRecovery: {
      status: "processing",
      attempts,
      nextAttemptAt: now,
      leaseUntil: new Date(now.getTime() + 120_000),
      leaseToken: "test-lease-token",
      updatedAt: now,
    },
  };
}

function createEscalation(): EscalationDocument {
  const now = new Date();

  return {
    _id: new ObjectId(),
    safetyEventId,
    caseId,
    conversationId,
    ownerType: "user",
    riskLevel: "high",
    category: "self_harm",
    status: ESCALATION_STATUS.OPEN,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

describe("escalation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.claimSafetyEventEscalationById.mockResolvedValue(
      createSafetyEvent(),
    );

    mocks.findEscalationBySafetyEventId.mockResolvedValue(null);

    mocks.createEscalation.mockImplementation(
      async (escalation) => ({
        ...escalation,
        _id: new ObjectId(),
      }),
    );

    mocks.completeSafetyEventEscalation.mockResolvedValue(true);
    mocks.retrySafetyEventEscalation.mockResolvedValue(true);
    mocks.deadLetterSafetyEventEscalation.mockResolvedValue(true);
  });

  it("creates and completes a claimed high-risk escalation", async () => {
    const result =
      await processSafetyEventEscalationNow(safetyEventId);

    expect(result).not.toBeNull();

    expect(mocks.createEscalation).toHaveBeenCalledTimes(1);

    expect(mocks.completeSafetyEventEscalation).toHaveBeenCalledWith(
      safetyEventId,
      "test-lease-token",
      expect.any(Date),
    );

    expect(mocks.retrySafetyEventEscalation).not.toHaveBeenCalled();
  });

  it("schedules a retry when escalation creation fails", async () => {
    mocks.createEscalation.mockRejectedValueOnce(
      new Error("DatabaseUnavailable"),
    );

    await expect(
      processSafetyEventEscalationNow(safetyEventId),
    ).rejects.toThrow("DatabaseUnavailable");

    expect(mocks.retrySafetyEventEscalation).toHaveBeenCalledWith(
      safetyEventId,
      "test-lease-token",
      expect.any(Date),
      "Error",
      expect.any(Date),
    );
  });

  it("moves an exhausted escalation to dead-letter", async () => {
    mocks.claimSafetyEventEscalationById.mockResolvedValue(
      createSafetyEvent(8),
    );

    mocks.createEscalation.mockRejectedValueOnce(
      new Error("PermanentFailure"),
    );

    await expect(
      processSafetyEventEscalationNow(safetyEventId),
    ).rejects.toThrow("PermanentFailure");

    expect(mocks.deadLetterSafetyEventEscalation).toHaveBeenCalledWith(
      safetyEventId,
      "test-lease-token",
      "Error",
      expect.any(Date),
    );

    expect(mocks.retrySafetyEventEscalation).not.toHaveBeenCalled();
  });

  it("rejects completion when lease ownership is lost", async () => {
    mocks.completeSafetyEventEscalation.mockResolvedValue(false);
    mocks.retrySafetyEventEscalation.mockResolvedValue(false);

    await expect(
      processSafetyEventEscalationNow(safetyEventId),
    ).rejects.toThrow("lease ownership lost or expired");

    expect(mocks.retrySafetyEventEscalation).toHaveBeenCalled();
  });
});
