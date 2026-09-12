import { AppError } from "./AppError.js";

export class InvalidCredentialsError
  extends AppError {
  constructor() {
    super(
      "Invalid email or password.",
      401,
      "INVALID_CREDENTIALS",
    );

    this.name =
      "InvalidCredentialsError";
  }
}