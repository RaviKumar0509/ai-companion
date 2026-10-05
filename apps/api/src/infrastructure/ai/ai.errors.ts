export class AIProviderError extends Error {
  public readonly provider: string;

  public constructor(
    message: string,
    provider: string,
    options?: ErrorOptions,
  ) {
    super(message, options);

    this.name = "AIProviderError";
    this.provider = provider;
  }
}