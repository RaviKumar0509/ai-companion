import { GoogleGenAI } from "@google/genai";

import { aiConfig } from "../../../config/ai.js";
import { env } from "../../../config/env.js";

import {
  logger,
} from "../../logger/logger.js";

import { AIProviderError } from "../ai.errors.js";

import type {
  AICompletionRequest,
  AICompletionResponse,
  AIMessage,
  AIProvider,
} from "../ai-provider.types.js";

function mapRole(
  role: AIMessage["role"],
): "user" | "model" {
  return role === "assistant"
    ? "model"
    : "user";
}

export class GeminiProvider implements AIProvider {
  private readonly client: GoogleGenAI;

  public constructor() {
    this.client = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
    });
  }

  public async generateCompletion(
    request: AICompletionRequest,
  ): Promise<AICompletionResponse> {
    const systemMessages = request.messages
      .filter(
        (message) =>
          message.role === "system",
      )
      .map(
        (message) =>
          message.content,
      )
      .join("\n\n");

    const conversationMessages = request.messages
      .filter(
        (message) =>
          message.role !== "system",
      )
      .map((message) => ({
        role: mapRole(message.role),
        parts: [
          {
            text: message.content,
          },
        ],
      }));

    try {
      const response =
        await this.client.models.generateContent({
          model: aiConfig.model,
          contents: conversationMessages,
          config: {
            ...(systemMessages
              ? {
                  systemInstruction:
                    systemMessages,
                }
              : {}),
            ...(request.temperature !== undefined
              ? {
                  temperature:
                    request.temperature,
                }
              : {}),
            ...(request.maxTokens !== undefined
              ? {
                  maxOutputTokens:
                    request.maxTokens,
                }
              : {}),
          },
        });

      const content =
        response.text?.trim();

      if (!content) {
        throw new AIProviderError(
          "Gemini returned an empty response.",
          aiConfig.provider,
        );
      }

      return {
        content,
        provider: aiConfig.provider,
        model: aiConfig.model,
      };
    } catch (error) {
      logger.error(
        {
          error,
          provider: aiConfig.provider,
          model: aiConfig.model,
        },
        "AI provider request failed",
      );

      if (
        error instanceof AIProviderError
      ) {
        throw error;
      }

      throw new AIProviderError(
        "AI provider request failed.",
        aiConfig.provider,
        {
          cause: error,
        },
      );
    }
  }
}