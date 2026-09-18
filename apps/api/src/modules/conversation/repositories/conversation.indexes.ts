import type { IndexDescription } from "mongodb";

export const CONVERSATION_INDEXES: IndexDescription[] = [
  {
    key: {
      caseId: 1,
      status: 1,
      updatedAt: -1,
    },
    name: "conversations_case_status_updated",
  },
  {
    key: {
      ownerType: 1,
      userId: 1,
      status: 1,
      updatedAt: -1,
    },
    name: "conversations_user_status_updated",
  },
  {
    key: {
      ownerType: 1,
      anonymousId: 1,
      status: 1,
      updatedAt: -1,
    },
    name: "conversations_anonymous_status_updated",
  },
  {
    key: {
      createdAt: -1,
    },
    name: "conversations_created_desc",
  },
];