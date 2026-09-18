import type {
  Collection,
  ObjectId,
} from "mongodb";

import { getCollection } from "../../../infrastructure/database/db.js";
import type { ConversationDocument } from "../types/conversation.types.js";

const CONVERSATIONS_COLLECTION = "conversations";

function getConversationCollection(): Collection<ConversationDocument> {
  return getCollection<ConversationDocument>(CONVERSATIONS_COLLECTION);
}

export async function createConversation(
  conversation: ConversationDocument,
): Promise<ConversationDocument> {
  const result = await getConversationCollection().insertOne(conversation);

  if (!result.acknowledged) {
    throw new Error(
      "Conversation creation was not acknowledged by MongoDB.",
    );
  }

  return conversation;
}

export async function findConversationById(
  conversationId: ObjectId,
): Promise<ConversationDocument | null> {
  return getConversationCollection().findOne({
    _id: conversationId,
  });
}



export async function findUserConversationById(
  conversationId: ObjectId,
  userId: ObjectId,
): Promise<ConversationDocument | null> {
  return getConversationCollection().findOne({
    _id: conversationId,
    ownerType: "user",
    userId,
  });
}

export async function findAnonymousConversationById(
  conversationId: ObjectId,
  anonymousId: string,
): Promise<ConversationDocument | null> {
  return getConversationCollection().findOne({
    _id: conversationId,
    ownerType: "anonymous",
    anonymousId,
  });
}

export async function listUserConversationsByCaseId(
  caseId: ObjectId,
  userId: ObjectId,
  limit: number,
  skip: number,
): Promise<ConversationDocument[]> {
  return getConversationCollection()
    .find({
      caseId,
      ownerType: "user",
      userId,
    })
    .sort({
      updatedAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .toArray();
}

export async function listAnonymousConversationsByCaseId(
  caseId: ObjectId,
  anonymousId: string,
  limit: number,
  skip: number,
): Promise<ConversationDocument[]> {
  return getConversationCollection()
    .find({
      caseId,
      ownerType: "anonymous",
      anonymousId,
    })
    .sort({
      updatedAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .toArray();
}

export async function updateConversation(
  conversationId: ObjectId,
  updates: Partial<ConversationDocument>,
): Promise<boolean> {
  const result = await getConversationCollection().updateOne(
    {
      _id: conversationId,
    },
    {
      $set: updates,
    },
  );

  return result.modifiedCount === 1;
}