import {
  AppError,
  type AppErrorDetails,
} from "./AppError.js";

export class ValidationError extends AppError {
  constructor(
    message = "Request validation failed.",
    details?: AppErrorDetails[],
  ) {
    super(
      message,
      400,
      "VALIDATION_ERROR",
      true,
      details,
    );

    this.name = "ValidationError";
  }
}