
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { ObjectId } from "mongodb";

import {
  USER_ROLE,
} from "../../auth/types/user.types.js";

import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/index.js";

import type {
  EscalationDocument,
} from "../../safety/types/escalation.types.js";

import type {
  SafetyEventDocument,
} from "../../safety/types/safety.types.js";

// --------------------------------------------------
// MOCK REPOSITORIES
// --------------------------------------------------

const repositoryMocks = vi.hoisted(() => ({
  listEscalations: vi.fn(),
  findEscalationById: vi.fn(),
  findSafetyEventById: vi.fn(),
}));

vi.mock(
  "../../safety/repositories/escalation.repository.js",
  () => ({
    listEscalations:
      repositoryMocks.listEscalations,

    findEscalationById:
      repositoryMocks.findEscalationById,
  }),
);

vi.mock(
  "../../safety/repositories/safety.repository.js",
  () => ({
    findSafetyEventById:
      repositoryMocks.findSafetyEventById,
  }),
);

// Import service after defining mocks.

import {
  listClinicianEscalations,
  getClinicianEscalation,
} from "./clinician.service.js";

// --------------------------------------------------
// TEST DATA FACTORIES
// --------------------------------------------------

function createEscalation(
  assignedTo: ObjectId,
): EscalationDocument {
  const now = new Date();

  return {
    _id: new ObjectId(),
    safetyEventId: new ObjectId(),
    caseId: new ObjectId(),
    conversationId: new ObjectId(),

    ownerType: "user",

    riskLevel: "high",
    category: "self_harm",

    status: "assigned",

    assignedTo,

    version: 1,

    createdAt: now,
    updatedAt: now,
    assignedAt: now,
  };
}

function createSafetyEvent(): SafetyEventDocument {
  const now = new Date();

  return {
    _id: new ObjectId(),
    conversationId: new ObjectId(),
    caseId: new ObjectId(),

    ownerType: "user",

    riskLevel: "high",
    category: "self_harm",
    action: "crisis",
    source: "message",

    createdAt: now,

    // Internal fields must not appear
    // in the clinician response.
    escalationRecovery: {
      status: "completed",
      attempts: 1,
      nextAttemptAt: now,
      leaseToken: "internal-test-token",
      updatedAt: now,
    },
  } as unknown as SafetyEventDocument;
}

// --------------------------------------------------
// TEST SUITE
// --------------------------------------------------

describe("Clinician Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ------------------------------------------------
  // ESCALATION LISTING
  // ------------------------------------------------

  describe("listClinicianEscalations", () => {
    it("should list only escalations assigned to the clinician", async () => {
      const clinicianId = new ObjectId();

      repositoryMocks.listEscalations.mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await listClinicianEscalations({
        userId: clinicianId.toString(),
        role: USER_ROLE.CLINICIAN,
        page: 1,
        limit: 20,
      });

      expect(result.items).toEqual([]);

      expect(
        repositoryMocks.listEscalations,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          skip: 0,
          includeAll: false,
          assignedTo: expect.any(ObjectId),
        }),
      );

      const options =
        repositoryMocks.listEscalations.mock.calls[0]?.[0];

      expect(
        options.assignedTo.toString(),
      ).toBe(clinicianId.toString());
    });

    it("should allow administrators to list all escalations", async () => {
      repositoryMocks.listEscalations.mockResolvedValue({
        items: [],
        total: 0,
      });

      await listClinicianEscalations({
        userId: new ObjectId().toString(),
        role: USER_ROLE.ADMIN,
        page: 1,
        limit: 20,
      });

      expect(
        repositoryMocks.listEscalations,
      ).toHaveBeenCalledWith({
        limit: 20,
        skip: 0,
        includeAll: true,
      });
    });

    it("should allow super administrators to list all escalations", async () => {
      repositoryMocks.listEscalations.mockResolvedValue({
        items: [],
        total: 0,
      });

      await listClinicianEscalations({
        userId: new ObjectId().toString(),
        role: USER_ROLE.SUPER_ADMIN,
        page: 1,
        limit: 20,
      });

      expect(
        repositoryMocks.listEscalations,
      ).toHaveBeenCalledWith({
        limit: 20,
        skip: 0,
        includeAll: true,
      });
    });

    it("should reject regular users", async () => {
      await expect(
        listClinicianEscalations({
          userId: new ObjectId().toString(),
          role: USER_ROLE.USER,
          page: 1,
          limit: 20,
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);

      expect(
        repositoryMocks.listEscalations,
      ).not.toHaveBeenCalled();
    });

    it("should calculate pagination correctly", async () => {
      repositoryMocks.listEscalations.mockResolvedValue({
        items: [],
        total: 45,
      });

      const result = await listClinicianEscalations({
        userId: new ObjectId().toString(),
        role: USER_ROLE.ADMIN,
        page: 3,
        limit: 10,
      });

      expect(result.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 45,
        totalPages: 5,
      });

      expect(
        repositoryMocks.listEscalations,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
        }),
      );
    });
  });

  // ------------------------------------------------
  // ESCALATION DETAILS
  // ------------------------------------------------

  describe("getClinicianEscalation", () => {
    it("should allow a clinician to retrieve their assigned escalation", async () => {
      const clinicianId = new ObjectId();

      const escalation =
        createEscalation(clinicianId);

      const safetyEvent =
        createSafetyEvent();

      repositoryMocks.findEscalationById.mockResolvedValue(
        escalation,
      );

      repositoryMocks.findSafetyEventById.mockResolvedValue(
        safetyEvent,
      );

      const result = await getClinicianEscalation({
        escalationId: escalation._id!.toString(),
        userId: clinicianId.toString(),
        role: USER_ROLE.CLINICIAN,
      });

      expect(result.escalation.id).toBe(
        escalation._id!.toString(),
      );

      expect(result.safetyEvent.id).toBe(
        safetyEvent._id!.toString(),
      );

      expect(
        repositoryMocks.findSafetyEventById,
      ).toHaveBeenCalledWith(
        escalation.safetyEventId,
      );
    });

    it("should prevent a clinician from retrieving another clinician's escalation", async () => {
      const assignedClinicianId =
        new ObjectId();

      const requestingClinicianId =
        new ObjectId();

      const escalation =
        createEscalation(assignedClinicianId);

      repositoryMocks.findEscalationById.mockResolvedValue(
        escalation,
      );

      await expect(
        getClinicianEscalation({
          escalationId: escalation._id!.toString(),
          userId: requestingClinicianId.toString(),
          role: USER_ROLE.CLINICIAN,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);

      expect(
        repositoryMocks.findSafetyEventById,
      ).not.toHaveBeenCalled();
    });

    it("should allow administrators to retrieve any escalation", async () => {
      const escalation =
        createEscalation(new ObjectId());

      const safetyEvent =
        createSafetyEvent();

      repositoryMocks.findEscalationById.mockResolvedValue(
        escalation,
      );

      repositoryMocks.findSafetyEventById.mockResolvedValue(
        safetyEvent,
      );

      const result = await getClinicianEscalation({
        escalationId: escalation._id!.toString(),
        userId: new ObjectId().toString(),
        role: USER_ROLE.ADMIN,
      });

      expect(result.escalation.id).toBe(
        escalation._id!.toString(),
      );
    });

    it("should allow super administrators to retrieve any escalation", async () => {
      const escalation =
        createEscalation(new ObjectId());

      repositoryMocks.findEscalationById.mockResolvedValue(
        escalation,
      );

      repositoryMocks.findSafetyEventById.mockResolvedValue(
        createSafetyEvent(),
      );

      const result = await getClinicianEscalation({
        escalationId: escalation._id!.toString(),
        userId: new ObjectId().toString(),
        role: USER_ROLE.SUPER_ADMIN,
      });

      expect(result.escalation.id).toBe(
        escalation._id!.toString(),
      );
    });

    it("should reject invalid escalation IDs", async () => {
      await expect(
        getClinicianEscalation({
          escalationId: "invalid-id",
          userId: new ObjectId().toString(),
          role: USER_ROLE.ADMIN,
        }),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(
        repositoryMocks.findEscalationById,
      ).not.toHaveBeenCalled();
    });

    it("should return not found when escalation does not exist", async () => {
      repositoryMocks.findEscalationById.mockResolvedValue(
        null,
      );

      await expect(
        getClinicianEscalation({
          escalationId: new ObjectId().toString(),
          userId: new ObjectId().toString(),
          role: USER_ROLE.ADMIN,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);

      expect(
        repositoryMocks.findSafetyEventById,
      ).not.toHaveBeenCalled();
    });

    it("should return not found when associated safety event does not exist", async () => {
      const escalation =
        createEscalation(new ObjectId());

      repositoryMocks.findEscalationById.mockResolvedValue(
        escalation,
      );

      repositoryMocks.findSafetyEventById.mockResolvedValue(
        null,
      );

      await expect(
        getClinicianEscalation({
          escalationId: escalation._id!.toString(),
          userId: new ObjectId().toString(),
          role: USER_ROLE.ADMIN,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should not expose internal safety-event recovery fields", async () => {
      const escalation =
        createEscalation(new ObjectId());

      const safetyEvent =
        createSafetyEvent();

      repositoryMocks.findEscalationById.mockResolvedValue(
        escalation,
      );

      repositoryMocks.findSafetyEventById.mockResolvedValue(
        safetyEvent,
      );

      const result = await getClinicianEscalation({
        escalationId: escalation._id!.toString(),
        userId: new ObjectId().toString(),
        role: USER_ROLE.ADMIN,
      });

      expect(result.safetyEvent).not.toHaveProperty(
        "escalationRecovery",
      );

      expect(result.safetyEvent).not.toHaveProperty(
        "userId",
      );

      expect(result.safetyEvent).not.toHaveProperty(
        "anonymousId",
      );
    });
  });
});
