import { MESSAGE_CONSTANTS } from "../constants/message.constants.js";
import type { MessageDocument } from "../types/message.types.js";

export function buildAIMessageContext(
  messages: MessageDocument[],
): MessageDocument[] {
  const selectedMessages: MessageDocument[] = [];
  let totalCharacters = 0;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (!message) {
      continue;
    }

    if (
      selectedMessages.length >=
      MESSAGE_CONSTANTS.MAX_AI_CONTEXT_MESSAGES
    ) {
      break;
    }

    const messageCharacters = message.content.length;

    if (
      selectedMessages.length > 0 &&
      totalCharacters + messageCharacters >
        MESSAGE_CONSTANTS.MAX_AI_CONTEXT_CHARACTERS
    ) {
      break;
    }

    selectedMessages.push(message);
    totalCharacters += messageCharacters;
  }

  return selectedMessages.reverse();
}