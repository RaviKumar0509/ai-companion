import { describe, expect, it } from "vitest";
import { mergeCaseContext } from "./case-context-merge.service.js";
import type { CaseContextDocument } from "../types/case-context.types.js";
import type { CaseContextExtraction } from "../schemas/case-context-extraction.schemas.js";
import {
  CASE_CONTEXT_STATUS,
  CASE_CONTEXT_VERSION,
} from "../types/case-context.types.js";

function makeContext(
  overrides: Partial<CaseContextDocument> = {},
): CaseContextDocument {
  return {
    caseId: "000000000000000000000001" as unknown as CaseContextDocument["caseId"],
    version: CASE_CONTEXT_VERSION,
    status: CASE_CONTEXT_STATUS.ACTIVE,
    summary: "Stress after work.",
    recoveryGoals: ["Make walking a regular habit"],
    knownTriggers: ["Stress after work"],
    copingStrategies: ["Going for a 20-minute walk"],
    supportPreferences: [],
    riskNotes: [],
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function makeExtraction(
  overrides: Partial<CaseContextExtraction> = {},
): CaseContextExtraction {
  return {
    summary: null,
    recoveryGoals: [],
    knownTriggers: [],
    copingStrategies: [],
    supportPreferences: [],
    ...overrides,
  };
}

describe("mergeCaseContext", () => {
  it("adds new coping strategies while preserving existing strategies", () => {
    const result = mergeCaseContext(
      makeContext(),
      makeExtraction({
        copingStrategies: ["Listening to calming music"],
      }),
    );

    expect(result.changed).toBe(true);
    expect(result.updates.copingStrategies).toEqual([
      "Going for a 20-minute walk",
      "Listening to calming music",
    ]);
  });

  it("ignores case-insensitive duplicates", () => {
    const result = mergeCaseContext(
      makeContext(),
      makeExtraction({
        copingStrategies: [
          "going for a 20-MINUTE walk",
          "  GOING FOR A 20-MINUTE WALK  ",
        ],
      }),
    );

    expect(result.changed).toBe(false);
    expect(result.updates.copingStrategies).toBeUndefined();
  });

  it("preserves existing context when extraction contains no new information", () => {
    const current = makeContext();
    const result = mergeCaseContext(current, makeExtraction());

    expect(result.changed).toBe(false);
    expect(result.updates).toEqual({});
    expect(current.copingStrategies).toEqual([
      "Going for a 20-minute walk",
    ]);
  });

  it("does not update the summary when the extracted summary is unchanged", () => {
    const result = mergeCaseContext(
      makeContext({ summary: "Stress after work." }),
      makeExtraction({ summary: " stress   after work. " }),
    );

    expect(result.changed).toBe(false);
    expect(result.updates.summary).toBeUndefined();
  });

  it("trims and updates a genuinely new summary", () => {
    const result = mergeCaseContext(
      makeContext(),
      makeExtraction({
        summary: " Stress after work; walking helps. ",
      }),
    );

    expect(result.changed).toBe(true);
    expect(result.updates.summary).toBe(
      "Stress after work; walking helps.",
    );
  });
});
