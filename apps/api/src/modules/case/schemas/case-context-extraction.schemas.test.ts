import { describe, expect, it } from "vitest";
import {
  caseContextExtractionSchema,
} from "./case-context-extraction.schemas.js";

const validExtraction = {
  summary: "The user experiences stress after work.",
  recoveryGoals: ["Build a walking habit"],
  knownTriggers: ["Stress after work"],
  copingStrategies: ["Go for a walk"],
  supportPreferences: ["Supportive conversations"],
};

describe("caseContextExtractionSchema", () => {
  it("accepts valid extracted context", () => {
    const result =
      caseContextExtractionSchema.safeParse(validExtraction);

    expect(result.success).toBe(true);
  });

  it("trims whitespace from strings", () => {
    const result = caseContextExtractionSchema.parse({
      ...validExtraction,
      summary: "  A concise summary  ",
      copingStrategies: ["  Go for a walk  "],
    });

    expect(result.summary).toBe("A concise summary");
    expect(result.copingStrategies).toEqual(["Go for a walk"]);
  });

  it("accepts a null summary and empty arrays", () => {
    const result = caseContextExtractionSchema.safeParse({
      summary: null,
      recoveryGoals: [],
      knownTriggers: [],
      copingStrategies: [],
      supportPreferences: [],
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty strings in list items", () => {
    const result = caseContextExtractionSchema.safeParse({
      ...validExtraction,
      copingStrategies: ["   "],
    });

    expect(result.success).toBe(false);
  });

  it("rejects list items longer than 500 characters", () => {
    const result = caseContextExtractionSchema.safeParse({
      ...validExtraction,
      copingStrategies: ["x".repeat(501)],
    });

    expect(result.success).toBe(false);
  });

  it("rejects lists containing more than 20 items", () => {
    const result = caseContextExtractionSchema.safeParse({
      ...validExtraction,
      recoveryGoals: Array.from(
        { length: 21 },
        (_, index) => `Goal ${index + 1}`,
      ),
    });

    expect(result.success).toBe(false);
  });

  it("rejects unexpected fields", () => {
    const result = caseContextExtractionSchema.safeParse({
      ...validExtraction,
      riskLevel: "high",
    });

    expect(result.success).toBe(false);
  });
});