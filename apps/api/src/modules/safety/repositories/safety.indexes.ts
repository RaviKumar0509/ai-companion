export const SAFETY_EVENT_INDEXES = [
  {
    key: {
      conversationId: 1,
      createdAt: -1,
    },
    name: "safety_events_conversation_created",
  },
  {
    key: {
      caseId: 1,
      createdAt: -1,
    },
    name: "safety_events_case_created",
  },
  {
    key: {
      riskLevel: 1,
      createdAt: -1,
    },
    name: "safety_events_risk_created",
  },
  {
    key: {
      userId: 1,
      createdAt: -1,
    },
    name: "safety_events_user_created",
    sparse: true,
  },
  {
    key: {
      anonymousId: 1,
      createdAt: -1,
    },
    name: "safety_events_anonymous_created",
    sparse: true,
  },
] as const;