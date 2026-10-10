import { AIProviderError } from "../../../infrastructure/ai/ai.errors.js";
import { createAIGateway } from "../../../infrastructure/ai/ai.gateway.factory.js";
import { buildSystemPrompt } from "../../../infrastructure/ai/prompt-manager.js";
import { SAFETY_ACTION } from "../../safety/types/safety.types.js";
import { assessOutputSafety } from "../../safety/services/output-safety.service.js";
import {
  OUTPUT_SAFETY_ACTION,
} from "../../safety/types/output-safety.types.js";
import { buildCrisisResponse } from "../../safety/services/crisis-response.service.js";
import { createAIFallbackResponse } from "./ai-fallback.service.js";
import type { AIOrchestrationInput, AIOrchestrationResult } from "../ai.types.js";
import type { AIResponse } from "../types/ai-response.types.js";
const aiGateway = createAIGateway();

const UNSAFE_OUTPUT_FALLBACK =
  "I want to make sure the information I provide is safe and appropriate. " +
  "I can't provide guidance that could put you or someone else at risk. " +
  "If you are in immediate danger, please contact emergency services or a qualified professional.";

export async function orchestrateAI(
  input: AIOrchestrationInput,
): Promise<AIResponse> {
  if (input.safetyResult.action === SAFETY_ACTION.CRISIS) {
    return {
      content: buildCrisisResponse(input.safetyResult),
      safetyResult: input.safetyResult,
      provider: "safety",
      model: "none",
    };
  }

  try {
const aiMessages = [
  {
    role: "system" as const,
    content: buildSystemPrompt(),
  },
  ...(input.caseContext ? [input.caseContext] : []),
  ...input.messages,
];

const response = await aiGateway.generateCompletion({
  messages: aiMessages,
});

    const outputSafety = assessOutputSafety(response.content);

    if (outputSafety.action === OUTPUT_SAFETY_ACTION.BLOCK) {
      return {
        content: UNSAFE_OUTPUT_FALLBACK,
        safetyResult: input.safetyResult,
        provider: "output-safety",
        model: "none",
      };
    }

    if (outputSafety.action === OUTPUT_SAFETY_ACTION.REPLACE) {
      return {
        content: UNSAFE_OUTPUT_FALLBACK,
        safetyResult: input.safetyResult,
        provider: "output-safety",
        model: "none",
      };
    }

    return {
      content: response.content,
      safetyResult: input.safetyResult,
      provider: response.provider,
      model: response.model,
    };
  } catch (error) {
    if (!(error instanceof AIProviderError)) {
      throw error;
    }

    const fallback = createAIFallbackResponse(input.safetyResult);

    return {
      content: fallback.content,
      safetyResult: fallback.safetyResult,
      provider: "fallback",
      model: "none",
    };
  }
}