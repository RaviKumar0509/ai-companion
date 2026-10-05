import type { SafetyResult } from "../../safety/types/safety.types.js";

export interface AIFallbackResponse {
  content: string;
  safetyResult: SafetyResult;
}

export function createAIFallbackResponse(
  safetyResult: SafetyResult,
): AIFallbackResponse {
  return {
    content:
      "I'm having trouble connecting right now. You can continue sharing what you're experiencing, and please consider speaking with a trusted person or qualified support professional.",
    safetyResult,
  };
}