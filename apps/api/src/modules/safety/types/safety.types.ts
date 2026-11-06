import type { ObjectId } from "mongodb";

export const SAFETY_RISK_LEVEL = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

export type SafetyRiskLevel =
  (typeof SAFETY_RISK_LEVEL)[keyof typeof SAFETY_RISK_LEVEL];

export const SAFETY_CATEGORY = {
  NONE: "none",
  SELF_HARM: "self_harm",
  MEDICAL_EMERGENCY: "medical_emergency",
  HARM_TO_OTHERS: "harm_to_others",
  GAMBLING_HARM: "gambling_harm",
} as const;

export type SafetyCategory =
  (typeof SAFETY_CATEGORY)[keyof typeof SAFETY_CATEGORY];

export const SAFETY_ACTION = {
  CONTINUE: "continue",
  SUPPORT: "support",
  CRISIS: "crisis",
} as const;

export type SafetyAction =
  (typeof SAFETY_ACTION)[keyof typeof SAFETY_ACTION];

export interface SafetyResult {
  riskLevel: SafetyRiskLevel;
  category: SafetyCategory;
  action: SafetyAction;
}

export const SAFETY_EVENT_SOURCE = {
  MESSAGE: "message",
} as const;

export type SafetyEventSource =
  (typeof SAFETY_EVENT_SOURCE)[keyof typeof SAFETY_EVENT_SOURCE];

export const ESCALATION_RECOVERY_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  DEAD_LETTER: "dead_letter",
} as const;

export type EscalationRecoveryStatus =
  (typeof ESCALATION_RECOVERY_STATUS)[keyof typeof ESCALATION_RECOVERY_STATUS];

export interface EscalationRecoveryState {
  status: EscalationRecoveryStatus;
  attempts: number;
  nextAttemptAt: Date;
  leaseUntil?: Date;
  leaseToken?: string;
  lastErrorName?: string;
  completedAt?: Date;
  updatedAt: Date;
}

export interface SafetyEventDocument {
  _id?: ObjectId;

  conversationId: ObjectId;
  caseId: ObjectId;

  ownerType: "user" | "anonymous";

  userId?: ObjectId;
  anonymousId?: string;
  escalationDelivery?: EscalationDeliveryState;
  escalationRecovery?: EscalationRecoveryState;

  riskLevel: SafetyRiskLevel;
  category: SafetyCategory;
  action: SafetyAction;

  source: SafetyEventSource;

  createdAt: Date;
  resolvedAt?: Date;
}

export const ESCALATION_DELIVERY_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  DEAD_LETTER: "dead_letter",
} as const;

export type EscalationDeliveryStatus =
  (typeof ESCALATION_DELIVERY_STATUS)[keyof typeof ESCALATION_DELIVERY_STATUS];

export interface EscalationDeliveryState {
  status: EscalationDeliveryStatus;
  attempts: number;
  nextAttemptAt: Date;
  leaseUntil?: Date;
  lastErrorName?: string;
  completedAt?: Date;
  updatedAt: Date;
}