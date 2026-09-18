import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";

type VerificationState =
  | "verifying"
  | "success"
  | "error";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token")?.trim() ?? "";

  const [state, setState] =
    useState<VerificationState>("verifying");

  const [message, setMessage] = useState(
    "Verifying your email address...",
  );

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage(
        "This email verification link is invalid or incomplete.",
      );
      return;
    }

    let cancelled = false;

    async function verifyEmail() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          },
        );

        const data: {
          success?: boolean;
          message?: string;
          error?: {
            message?: string;
          };
        } = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok || !data.success) {
          setState("error");
          setMessage(
            data.error?.message ??
              data.message ??
              "Unable to verify your email address.",
          );
          return;
        }

        setState("success");
        setMessage(
          data.message ??
            "Your email address has been verified successfully.",
        );
      } catch {
        if (cancelled) {
          return;
        }

        setState("error");
        setMessage(
          "Unable to verify your email address. Please try again.",
        );
      }
    }

    void verifyEmail();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main>
      <h1>Verify Email</h1>

      {state === "verifying" && <p>{message}</p>}

      {state === "success" && (
        <section role="status">
          <p>{message}</p>

          <Link to="/login">
            Continue to login
          </Link>
        </section>
      )}

      {state === "error" && (
        <section role="alert">
          <p>{message}</p>

          <Link to="/login">
            Return to login
          </Link>
        </section>
      )}
    </main>
  );
}