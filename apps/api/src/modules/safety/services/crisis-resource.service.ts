import { HONG_KONG_CRISIS_RESOURCES } from "../constants/crisis-resource.constants.js";
import type { CrisisResource } from "../types/crisis-resource.types.js";
import type { SafetyCategory } from "../types/safety.types.js";

export function getCrisisResources(
  category: SafetyCategory,
): readonly CrisisResource[] {
  return HONG_KONG_CRISIS_RESOURCES.filter((resource) =>
    resource.categories.includes(category),
  );
}