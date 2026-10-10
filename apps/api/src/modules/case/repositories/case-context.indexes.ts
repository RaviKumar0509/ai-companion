export const CASE_CONTEXT_INDEXES = [
  {
    key: {
      caseId: 1,
    },
    name: "case_contexts_case_unique",
    unique: true,
  },
  {
    key: {
      updatedAt: -1,
    },
    name: "case_contexts_updated",
  },
] as const;
