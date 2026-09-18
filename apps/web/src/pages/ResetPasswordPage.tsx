import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";

const MIN_PASSWORD_LENGTH = 12;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();

  const token = useMemo(
    () => searchParams.get("token")?.trim() ?? "",
    [searchParams],
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    if (!token) {
      setErrorMessage("This password reset link is invalid.");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(
        `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(
        `${API_BASE_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            newPassword: password,
          }),
        },
      );

      const data: {
        success?: boolean;
        message?: string;
        error?: {
          message?: string;
        };
      } = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error?.message ??
            data.message ??
            "Unable to reset your password.",
        );
      }

      setPassword("");
      setConfirmPassword("");

      setSuccessMessage(
        data.message ?? "Your password has been reset successfully.",
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to reset your password. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <main>
        <h1>Reset Password</h1>

        <p>This password reset link is invalid or incomplete.</p>

        <Link to="/login">Return to login</Link>
      </main>
    );
  }

  return (
    <main>
      <h1>Reset Password</h1>

      <p>Choose a new password for your AI Companion account.</p>

      {errorMessage && <p role="alert">{errorMessage}</p>}

      {successMessage && (
        <section role="status">
          <p>{successMessage}</p>

          <Link to="/login">Continue to login</Link>
        </section>
      )}

      {!successMessage && (
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password">New Password</label>

            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={128}
              autoComplete="new-password"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword">Confirm Password</label>

            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={128}
              autoComplete="new-password"
              required
              disabled={isSubmitting}
            />
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}

      {!successMessage && (
        <p>
          <Link to="/login">Return to login</Link>
        </p>
      )}
    </main>
  );
}