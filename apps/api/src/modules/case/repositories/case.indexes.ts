import type { IndexDescription } from "mongodb";

export const CASE_INDEXES: IndexDescription[] = [
  {
    key: {
      ownerType: 1,
      userId: 1,
      status: 1,
      updatedAt: -1,
    },
    name: "cases_user_status_updated",
  },
  {
    key: {
      ownerType: 1,
      anonymousId: 1,
      status: 1,
      updatedAt: -1,
    },
    name: "cases_anonymous_status_updated",
  },
  {
    key: {
      createdAt: -1,
    },
    name: "cases_created_desc",
  },
];