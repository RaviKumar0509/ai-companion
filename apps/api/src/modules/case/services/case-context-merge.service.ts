
import type { CaseContextDocument } from "../types/case-context.types.js";
import type { CaseContextExtraction } from "../schemas/case-context-extraction.schemas.js";

export interface CaseContextMergeResult {
  updates: {
    summary?: string;
    recoveryGoals?: string[];
    knownTriggers?: string[];
    copingStrategies?: string[];
    supportPreferences?: string[];
  };
  changed: boolean;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function mergeUniqueItems(
  existing: string[] | undefined,
  extracted: string[],
): string[] | undefined {
  if (extracted.length === 0) {
    return undefined;
  }

  const original = existing ?? [];
  const merged = [...original];
  const existingKeys = new Set(merged.map(normalizeText));

  for (const item of extracted) {
    const normalizedItem = item.trim();
    const key = normalizeText(normalizedItem);

    if (!existingKeys.has(key)) {
      merged.push(normalizedItem);
      existingKeys.add(key);
    }
  }

  // No new items means no update is required.
  if (merged.length === original.length) {
    return undefined;
  }

  return merged;
}

export function mergeCaseContext(
  current: CaseContextDocument,
  extracted: CaseContextExtraction,
): CaseContextMergeResult {
  const updates: CaseContextMergeResult["updates"] = {};

  if (
    extracted.summary !== null &&
    extracted.summary.trim().length > 0 &&
    normalizeText(extracted.summary) !==
      normalizeText(current.summary ?? "")
  ) {
    updates.summary = extracted.summary.trim();
  }

  const recoveryGoals = mergeUniqueItems(
    current.recoveryGoals,
    extracted.recoveryGoals,
  );

  if (recoveryGoals !== undefined) {
    updates.recoveryGoals = recoveryGoals;
  }

  const knownTriggers = mergeUniqueItems(
    current.knownTriggers,
    extracted.knownTriggers,
  );

  if (knownTriggers !== undefined) {
    updates.knownTriggers = knownTriggers;
  }

  const copingStrategies = mergeUniqueItems(
    current.copingStrategies,
    extracted.copingStrategies,
  );

  if (copingStrategies !== undefined) {
    updates.copingStrategies = copingStrategies;
  }

  const supportPreferences = mergeUniqueItems(
    current.supportPreferences,
    extracted.supportPreferences,
  );

  if (supportPreferences !== undefined) {
    updates.supportPreferences = supportPreferences;
  }

  const changed = Object.keys(updates).length > 0;

  return { updates, changed };
}
