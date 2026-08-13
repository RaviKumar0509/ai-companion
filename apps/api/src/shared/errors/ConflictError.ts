import { AppError } from "./AppError.js";

export class ConflictError extends AppError {
  constructor(
    message = "Resource already exists.",
  ) {
    super(
      message,
      409,
      "RESOURCE_CONFLICT",
    );

    this.name = "ConflictError";
  }
}