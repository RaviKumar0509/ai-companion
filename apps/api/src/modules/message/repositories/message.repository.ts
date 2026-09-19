import type {
  Collection,
  ObjectId,
} from "mongodb";

import { getCollection } from "../../../infrastructure/database/db.js";

import type {
  MessageDocument,
} from "../types/message.types.js";

const MESSAGES_COLLECTION = "messages";

function getMessageCollection(): Collection<MessageDocument> {
  return getCollection<MessageDocument>(
    MESSAGES_COLLECTION,
  );
}

export async function createMessage(
  message: MessageDocument,
): Promise<MessageDocument> {
  const result =
    await getMessageCollection().insertOne(message);

  if (!result.acknowledged) {
    throw new Error(
      "Message creation was not acknowledged by MongoDB.",
    );
  }

  return message;
}

export async function findMessageById(
  messageId: ObjectId,
): Promise<MessageDocument | null> {
  return getMessageCollection().findOne({
    _id: messageId,
  });
}

export async function listMessagesByConversationId(
  conversationId: ObjectId,
  limit: number,
  skip: number,
): Promise<MessageDocument[]> {
  return getMessageCollection()
    .find({
      conversationId,
    })
    .sort({
      createdAt: 1,
    })
    .skip(skip)
    .limit(limit)
    .toArray();
}

export async function countMessagesByConversationId(
  conversationId: ObjectId,
): Promise<number> {
  return getMessageCollection().countDocuments({
    conversationId,
  });
}