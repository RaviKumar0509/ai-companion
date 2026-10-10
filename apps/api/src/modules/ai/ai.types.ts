import type {
  AICompletionResponse,
  AIMessage,
} from "../../infrastructure/ai/ai-provider.types.js";

import type {
  SafetyResult,
} from "../safety/types/safety.types.js";

export interface AIOrchestrationInput {
  messages: AIMessage[];
  safetyResult: SafetyResult;
  caseContext?: AIMessage;
}

export interface AIOrchestrationResult {
  safetyResult: SafetyResult;
  response?: AICompletionResponse;
}