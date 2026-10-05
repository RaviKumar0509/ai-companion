import { aiConfig } from "../../config/ai.js";
import { AIGateway } from "./ai.gateway.js";
import type { AIProvider } from "./ai-provider.types.js";
import { GeminiProvider } from "./providers/gemini.provider.js";

function createAIProvider(): AIProvider {
  switch (aiConfig.provider) {
    case "gemini":
      return new GeminiProvider();

    default:
      throw new Error(
        `Unsupported AI provider: ${aiConfig.provider}`,
      );
  }
}

export function createAIGateway(): AIGateway {
  return new AIGateway(createAIProvider());
}