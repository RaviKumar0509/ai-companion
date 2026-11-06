
export const ESCALATION_INDEXES = [
  {
    key: {
      safetyEventId: 1,
    },
    name: "escalations_safety_event_unique",
    unique: true,
  },
  {
    key: {
      status: 1,
      createdAt: -1,
    },
    name: "escalations_status_created",
  },
  {
    key: {
      caseId: 1,
      createdAt: -1,
    },
    name: "escalations_case_created",
  },
  {
    key: {
      assignedTo: 1,
      status: 1,
    },
    name: "escalations_assignee_status",
    sparse: true,
  },
] as const;
