import { AppError } from "./AppError.js";

export class UnauthorizedError extends AppError {
  constructor(
    message = "Authentication required.",
  ) {
    super(
      message,
      401,
      "UNAUTHORIZED",
    );

    this.name = "UnauthorizedError";
  }
}