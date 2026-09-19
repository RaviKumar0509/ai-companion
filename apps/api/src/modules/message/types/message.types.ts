import type { ObjectId } from "mongodb";

export const MESSAGE_SENDER_TYPE = {
  USER: "user",
  ASSISTANT: "assistant",
  SYSTEM: "system",
} as const;

export type MessageSenderType =
  (typeof MESSAGE_SENDER_TYPE)[keyof typeof MESSAGE_SENDER_TYPE];

export const MESSAGE_CONTENT_TYPE = {
  TEXT: "text",
} as const;

export type MessageContentType =
  (typeof MESSAGE_CONTENT_TYPE)[keyof typeof MESSAGE_CONTENT_TYPE];

export interface MessageDocument {
  _id?: ObjectId;

  conversationId: ObjectId;

  senderType: MessageSenderType;

  contentType: MessageContentType;

  content: string;

  createdAt: Date;
  updatedAt: Date;
}