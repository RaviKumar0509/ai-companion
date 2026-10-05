export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface AICompletionResponse {
  content: string;
  provider: string;
  model: string;
}

export interface AIProvider {
  generateCompletion(
    request: AICompletionRequest,
  ): Promise<AICompletionResponse>;
}