import { getCrisisResources } from "./crisis-resource.service.js";
import type { SafetyResult } from "../types/safety.types.js";

export function buildCrisisResponse(
  safetyResult: SafetyResult,
): string {
  const resources = getCrisisResources(safetyResult.category);

  const resourceLines = resources
    .map(
      (resource) =>
        `${resource.name}: ${resource.phone} (${resource.availability})`,
    )
    .join("\n");

  return [
    "Please seek immediate human or emergency support. You do not have to handle this situation alone.",
    "",
    "If you are in immediate danger or there is a medical emergency, call 999.",
    "",
    "You can also contact:",
    resourceLines,
    "",
    "This service is not a substitute for emergency or professional care.",
  ].join("\n");
}