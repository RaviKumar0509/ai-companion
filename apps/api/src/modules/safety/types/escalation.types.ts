
import type { ObjectId } from "mongodb";

export const ESCALATION_STATUS = {
  OPEN: "open",
  ACKNOWLEDGED: "acknowledged",
  ASSIGNED: "assigned",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
  CLOSED: "closed",
} as const;

export type EscalationStatus =
  (typeof ESCALATION_STATUS)[keyof typeof ESCALATION_STATUS];

export interface EscalationDocument {
  _id?: ObjectId;

  safetyEventId: ObjectId;
  caseId: ObjectId;
  conversationId: ObjectId;

  ownerType: "user" | "anonymous";

  riskLevel: "high";
  category: string;

  status: EscalationStatus;

  assignedTo?: ObjectId;
  acknowledgedAt?: Date;
  assignedAt?: Date;
  startedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;

  version: number;

  createdAt: Date;
  updatedAt: Date;
}
