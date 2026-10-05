import type {
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
} from "./ai-provider.types.js";

export class AIGateway {
  public constructor(
    private readonly provider: AIProvider,
  ) {}

  public async generateCompletion(
    request: AICompletionRequest,
  ): Promise<AICompletionResponse> {
    return this.provider.generateCompletion(request);
  }
}