
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateCompletion: vi.fn(),
  ensureCaseContext: vi.fn(),
  updateCaseContextData: vi.fn(),
}));

vi.mock("../../../infrastructure/ai/ai.gateway.factory.js", () => ({
  createAIGateway: () => ({
    generateCompletion: mocks.generateCompletion,
  }),
}));

vi.mock("./case-context.service.js", () => ({
  ensureCaseContext: mocks.ensureCaseContext,
  updateCaseContextData: mocks.updateCaseContextData,
}));

import { extractAndUpdateCaseContext } from "./case-context-extraction.service.js";
import type { AIMessage } from "../../../infrastructure/ai/ai-provider.types.js";

const caseId = "000000000000000000000001" as never;

const currentContext = {
  caseId,
  version: 1,
  status: "active",
  summary: "Stress after work.",
  recoveryGoals: ["Build a walking habit"],
  knownTriggers: ["Stress after work"],
  copingStrategies: ["Go for a walk"],
  supportPreferences: [],
  riskNotes: [],
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const userMessage: AIMessage = {
  role: "user",
  content: "I feel stressed after work.",
};

const validExtraction = {
  summary: "Stress after work.",
  recoveryGoals: ["Build a walking habit"],
  knownTriggers: ["Stress after work"],
  copingStrategies: ["Go for a walk"],
  supportPreferences: [],
};

describe("extractAndUpdateCaseContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureCaseContext.mockResolvedValue(currentContext);
    mocks.updateCaseContextData.mockResolvedValue(true);
  });

  it("returns false without user messages or external calls", async () => {
    const messages: AIMessage[] = [
      { role: "assistant", content: "How are you feeling?" },
    ];

    await expect(
      extractAndUpdateCaseContext(caseId, messages),
    ).resolves.toBe(false);

    expect(mocks.ensureCaseContext).not.toHaveBeenCalled();
    expect(mocks.generateCompletion).not.toHaveBeenCalled();
  });

  it("returns false when the AI response contains invalid JSON", async () => {
    mocks.generateCompletion.mockResolvedValue({
      content: "This is not JSON",
    });

    await expect(
      extractAndUpdateCaseContext(caseId, [userMessage]),
    ).resolves.toBe(false);

    expect(mocks.ensureCaseContext).toHaveBeenCalledOnce();
    expect(mocks.updateCaseContextData).not.toHaveBeenCalled();
  });

  it("does not write when the extraction contains no new information", async () => {
    mocks.generateCompletion.mockResolvedValue({
      content: JSON.stringify(validExtraction),
    });

    await expect(
      extractAndUpdateCaseContext(caseId, [userMessage]),
    ).resolves.toBe(false);

    expect(mocks.updateCaseContextData).not.toHaveBeenCalled();
  });

  it("updates context when the AI extracts new information", async () => {
    mocks.generateCompletion.mockResolvedValue({
      content: JSON.stringify({
        ...validExtraction,
        copingStrategies: ["Go for a walk", "Listen to calming music"],
      }),
    });

    await expect(
      extractAndUpdateCaseContext(caseId, [userMessage]),
    ).resolves.toBe(true);

    expect(mocks.updateCaseContextData).toHaveBeenCalledOnce();
    expect(mocks.updateCaseContextData).toHaveBeenCalledWith(
      caseId,
      expect.objectContaining({
        copingStrategies: [
          "Go for a walk",
          "Listen to calming music",
        ],
      }),
    );
  });
});
