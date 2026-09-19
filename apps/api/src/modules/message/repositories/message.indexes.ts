import type { IndexDescription } from "mongodb";

export const MESSAGE_INDEXES: IndexDescription[] = [
  {
    key: {
      conversationId: 1,
      createdAt: 1,
    },
    name: "messages_conversation_created",
  },
  {
    key: {
      conversationId: 1,
      updatedAt: -1,
    },
    name: "messages_conversation_updated",
  },
];