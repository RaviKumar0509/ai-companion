export interface AppErrorDetails {
  path: PropertyKey[];
  message: string;
  code: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details: AppErrorDetails[] | undefined;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    details?: AppErrorDetails[],
  ) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(
      this,
      this.constructor,
    );
  }
}