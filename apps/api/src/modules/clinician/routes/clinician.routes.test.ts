
import express, {
  type ErrorRequestHandler,
} from "express";

import request from "supertest";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { ObjectId } from "mongodb";

import {
  UnauthorizedError,
} from "../../../shared/errors/index.js";

import clinicianRoutes from "./clinician.routes.js";

import {
  USER_ROLE,
  USER_STATUS,
  type UserRole,
} from "../../auth/types/user.types.js";

import {
  SESSION_STATUS,
} from "../../auth/types/session.types.js";

import type {
  EscalationDocument,
} from "../../safety/types/escalation.types.js";

import type {
  SafetyEventDocument,
} from "../../safety/types/safety.types.js";

// --------------------------------------------------
// Mock dependencies
// --------------------------------------------------

const mocks = vi.hoisted(() => ({
  verifyAccessToken: vi.fn(),
  findSessionById: vi.fn(),
  findUserById: vi.fn(),
  listEscalations: vi.fn(),
  findEscalationById: vi.fn(),
  findSafetyEventById: vi.fn(),
}));

vi.mock(
  "../../auth/services/token.service.js",
  () => ({
    verifyAccessToken: mocks.verifyAccessToken,
  }),
);

vi.mock(
  "../../auth/repositories/session.repository.js",
  () => ({
    findSessionById: mocks.findSessionById,
  }),
);

vi.mock(
  "../../auth/repositories/user.repository.js",
  () => ({
    findUserById: mocks.findUserById,
  }),
);

vi.mock(
  "../../safety/repositories/escalation.repository.js",
  () => ({
    listEscalations: mocks.listEscalations,
    findEscalationById: mocks.findEscalationById,
  }),
);

vi.mock(
  "../../safety/repositories/safety.repository.js",
  () => ({
    findSafetyEventById: mocks.findSafetyEventById,
  }),
);

// --------------------------------------------------
// Express test application
// --------------------------------------------------

const app = express();

app.use(express.json());

app.use(
  "/api/v1/clinician",
  clinicianRoutes,
);

// Minimal test error handler.
// The production error handler is not replaced
// in the actual application.

const testErrorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  const appError = error as {
    statusCode?: number;
    code?: string;
    message?: string;
  };

  res.status(appError.statusCode ?? 500).json({
    success: false,
    code: appError.code ?? "INTERNAL_SERVER_ERROR",
    message: appError.message ?? "Internal server error.",
  });
};

app.use(testErrorHandler);

// --------------------------------------------------
// Test fixtures
// --------------------------------------------------

const ACCESS_TOKEN = "test-access-token";

function createEscalation(
  clinicianId: ObjectId,
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
    assignedTo: clinicianId,
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
    caseId: new ObjectId(),
    conversationId: new ObjectId(),
    ownerType: "user",
    userId: new ObjectId(),
    riskLevel: "high",
    category: "self_harm",
    action: "escalate",
    source: "message",
    createdAt: now,

    // Sensitive internal fields must never
    // appear in clinician API responses.
    escalationRecovery: {
      status: "processing",
      leaseToken: "internal-secret-lease-token",
    },
    escalationDelivery: {
      status: "pending",
    },
  } as unknown as SafetyEventDocument;
}

// --------------------------------------------------
// Authentication setup
// --------------------------------------------------

function authenticateAs(
  role: UserRole = USER_ROLE.CLINICIAN,
) {
  const userId = new ObjectId();
  const sessionId = new ObjectId().toHexString();

  mocks.verifyAccessToken.mockResolvedValue({
    sub: userId.toHexString(),
    sid: sessionId,
  });

  mocks.findSessionById.mockResolvedValue({
    _id: new ObjectId(sessionId),
    userId,
    status: SESSION_STATUS.ACTIVE,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  mocks.findUserById.mockResolvedValue({
    _id: userId,
    email: "clinician@example.com",
    role,
    status: USER_STATUS.ACTIVE,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    userId,
    sessionId,
  };
}

function withAuth() {
  return {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
  };
}

// --------------------------------------------------
// Tests
// --------------------------------------------------

describe("Clinician Routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.listEscalations.mockResolvedValue({
      items: [],
      total: 0,
    });

    mocks.findEscalationById.mockResolvedValue(null);

    mocks.findSafetyEventById.mockResolvedValue(null);
  });

  // ----------------------------------------------
  // Authentication
  // ----------------------------------------------

  describe("Authentication", () => {
    it("should reject requests without an access token", async () => {
      const response = await request(app)
        .get("/api/v1/clinician/escalations");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);

      expect(mocks.verifyAccessToken).not.toHaveBeenCalled();
    });

    it("should reject an invalid access token", async () => {
      mocks.verifyAccessToken.mockRejectedValue(
        new UnauthorizedError(
          "Invalid authentication credentials.",
        ),
      );

      const response = await request(app)
        .get("/api/v1/clinician/escalations")
        .set(withAuth());

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  }); // FIX: Authentication describe block closed here.

  // ----------------------------------------------
  // Role authorization
  // ----------------------------------------------

  describe("Role Authorization", () => {
    it("should reject regular users with 403", async () => {
      authenticateAs(USER_ROLE.USER);

      const response = await request(app)
        .get("/api/v1/clinician/escalations")
        .set(withAuth());

      expect(response.status).toBe(403);
      expect(response.body.code).toBe("FORBIDDEN");
    });

    it("should use the database role instead of a JWT role", async () => {
      const userId = new ObjectId();
      const sessionId = new ObjectId().toHexString();

      mocks.verifyAccessToken.mockResolvedValue({
        sub: userId.toHexString(),
        sid: sessionId,
        role: USER_ROLE.ADMIN,
      });

      mocks.findSessionById.mockResolvedValue({
        _id: new ObjectId(sessionId),
        userId,
        status: SESSION_STATUS.ACTIVE,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      // Database says this is a regular user.
      mocks.findUserById.mockResolvedValue({
        _id: userId,
        role: USER_ROLE.USER,
        status: USER_STATUS.ACTIVE,
      });

      const response = await request(app)
        .get("/api/v1/clinician/escalations")
        .set(withAuth());

      expect(response.status).toBe(403);
    });
  });

  // ----------------------------------------------
  // Query validation
  // ----------------------------------------------

  describe("Query Validation", () => {
    it("should reject an invalid page number", async () => {
      authenticateAs();

      const response = await request(app)
        .get("/api/v1/clinician/escalations?page=0")
        .set(withAuth());

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      expect(mocks.listEscalations).not.toHaveBeenCalled();
    });

    it("should reject a limit greater than 100", async () => {
      authenticateAs();

      const response = await request(app)
        .get("/api/v1/clinician/escalations?limit=101")
        .set(withAuth());

      expect(response.status).toBe(400);

      expect(mocks.listEscalations).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------
  // List escalations
  // ----------------------------------------------

  describe("GET /escalations", () => {
    it("should allow an authenticated clinician to list escalations", async () => {
      authenticateAs();

      mocks.listEscalations.mockResolvedValue({
        items: [],
        total: 0,
      });

      const response = await request(app)
        .get("/api/v1/clinician/escalations")
        .set(withAuth());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.items).toEqual([]);
      expect(response.body.data.pagination).toBeDefined();

      expect(mocks.listEscalations).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------
  // Escalation details
  // ----------------------------------------------

  describe("GET /escalations/:id", () => {
    it("should return an assigned escalation to its clinician", async () => {
      const { userId } = authenticateAs();

      const escalation = createEscalation(userId);
      const safetyEvent = createSafetyEvent();

      mocks.findEscalationById.mockResolvedValue(
        escalation,
      );

      mocks.findSafetyEventById.mockResolvedValue(
        safetyEvent,
      );

      const response = await request(app)
        .get(
          `/api/v1/clinician/escalations/${escalation._id!.toString()}`,
        )
        .set(withAuth());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.escalation.id).toBe(
        escalation._id!.toString(),
      );

      expect(response.body.data.safetyEvent).toBeDefined();
    });

    it("should not expose sensitive safety-event fields", async () => {
      const { userId } = authenticateAs();

      const escalation = createEscalation(userId);

      mocks.findEscalationById.mockResolvedValue(
        escalation,
      );

      mocks.findSafetyEventById.mockResolvedValue(
        createSafetyEvent(),
      );

      const response = await request(app)
        .get(
          `/api/v1/clinician/escalations/${escalation._id!.toString()}`,
        )
        .set(withAuth());

      expect(response.status).toBe(200);

      const responseText = JSON.stringify(response.body);

      expect(responseText).not.toContain(
        "internal-secret-lease-token",
      );

      expect(response.body.data.safetyEvent.escalationRecovery)
        .toBeUndefined();

      expect(response.body.data.safetyEvent.escalationDelivery)
        .toBeUndefined();

      expect(response.body.data.safetyEvent.userId)
        .toBeUndefined();
    });

    it("should return 400 for an invalid escalation ID", async () => {
      authenticateAs();

      const response = await request(app)
        .get("/api/v1/clinician/escalations/invalid-id")
        .set(withAuth());

      expect(response.status).toBe(400);
    });
  });
});
