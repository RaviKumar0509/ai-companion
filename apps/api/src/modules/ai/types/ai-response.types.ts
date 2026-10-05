import type { SafetyResult } from "../../safety/types/safety.types.js";

export interface AIResponse {
  content: string;
  safetyResult: SafetyResult;
  provider: string;
  model: string;
}