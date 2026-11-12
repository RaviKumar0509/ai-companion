
import { ObjectId } from "mongodb";

import {
  ForbiddenError,
} from "../../../shared/errors/index.js";

import {
  USER_ROLE,
} from "../../auth/types/user.types.js";

import type {
  UserRole,
} from "../../auth/types/user.types.js";

import {
  listEscalations,
} from "../../safety/repositories/escalation.repository.js";

import type {
  EscalationStatus,
} from "../../safety/types/escalation.types.js";

import {
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/index.js";

import {
  findEscalationById,
} from "../../safety/repositories/escalation.repository.js";

import {
  findSafetyEventById,
} from "../../safety/repositories/safety.repository.js";

export interface ListClinicianEscalationsInput {
  userId: string;
  role: UserRole;
  page: number;
  limit: number;
  status?: EscalationStatus;
}

export async function listClinicianEscalations(
  input: ListClinicianEscalationsInput,
) {
  const includeAll =
    input.role === USER_ROLE.ADMIN ||
    input.role === USER_ROLE.SUPER_ADMIN;

  if (
    input.role !== USER_ROLE.CLINICIAN &&
    !includeAll
  ) {
    throw new ForbiddenError();
  }

  const skip = (input.page - 1) * input.limit;

const result = await listEscalations({
  limit: input.limit,
  skip,
  ...(input.status !== undefined
    ? { status: input.status }
    : {}),
  ...(!includeAll
    ? { assignedTo: new ObjectId(input.userId) }
    : {}),
  includeAll,
});
  const items = result.items.map((escalation) => {
    if (!escalation._id) {
      throw new Error(
        "Escalation document is missing its ID.",
      );
    }

    return {
      id: escalation._id.toString(),
      caseId: escalation.caseId.toString(),
      conversationId: escalation.conversationId.toString(),
      ownerType: escalation.ownerType,
      riskLevel: escalation.riskLevel,
      category: escalation.category,
      status: escalation.status,
      assignedTo: escalation.assignedTo?.toString(),
      createdAt: escalation.createdAt,
      updatedAt: escalation.updatedAt,
      acknowledgedAt: escalation.acknowledgedAt,
      assignedAt: escalation.assignedAt,
      startedAt: escalation.startedAt,
      resolvedAt: escalation.resolvedAt,
      closedAt: escalation.closedAt,
    };
  });

  return {
    items,
    pagination: {
      page: input.page,
      limit: input.limit,
      total: result.total,
      totalPages: Math.ceil(
        result.total / input.limit,
      ),
    },
  };
}



export interface GetClinicianEscalationInput {
  escalationId: string;
  userId: string;
  role: UserRole;
}

export async function getClinicianEscalation(
  input: GetClinicianEscalationInput,
) {
  if (!ObjectId.isValid(input.escalationId)) {
    throw new ValidationError(
      "Invalid escalation ID.",
    );
  }

  const escalationId = new ObjectId(
    input.escalationId,
  );

  const escalation =
    await findEscalationById(escalationId);

  if (!escalation) {
    throw new NotFoundError(
      "Escalation not found.",
    );
  }

  const isAdministrator =
    input.role === USER_ROLE.ADMIN ||
    input.role === USER_ROLE.SUPER_ADMIN;

  /*
   * Clinicians can access only their
   * assigned escalations.
   *
   * Return 404 instead of 403 to avoid
   * revealing the existence of another
   * clinician's escalation.
   */
  if (
    !isAdministrator &&
    (
      input.role !== USER_ROLE.CLINICIAN ||
      !escalation.assignedTo ||
      escalation.assignedTo.toString() !== input.userId
    )
  ) {
    throw new NotFoundError(
      "Escalation not found.",
    );
  }

  const safetyEvent =
    await findSafetyEventById(
      escalation.safetyEventId,
    );

  if (!safetyEvent) {
    throw new NotFoundError(
      "Associated safety event not found.",
    );
  }

  return {
    escalation: {
      id: escalation._id?.toString(),
      caseId: escalation.caseId.toString(),
      conversationId: escalation.conversationId.toString(),
      ownerType: escalation.ownerType,
      riskLevel: escalation.riskLevel,
      category: escalation.category,
      status: escalation.status,
      assignedTo: escalation.assignedTo?.toString(),
      version: escalation.version,
      createdAt: escalation.createdAt,
      updatedAt: escalation.updatedAt,
      acknowledgedAt: escalation.acknowledgedAt,
      assignedAt: escalation.assignedAt,
      startedAt: escalation.startedAt,
      resolvedAt: escalation.resolvedAt,
      closedAt: escalation.closedAt,
    },

    safetyEvent: {
      id: safetyEvent._id?.toString(),
      riskLevel: safetyEvent.riskLevel,
      category: safetyEvent.category,
      action: safetyEvent.action,
      source: safetyEvent.source,
      createdAt: safetyEvent.createdAt,
      resolvedAt: safetyEvent.resolvedAt,
    },
  };
}
