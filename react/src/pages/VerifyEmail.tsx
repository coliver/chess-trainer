import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";

type VerificationState = "loading" | "success" | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<VerificationState>("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const verify = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setState("error");
        return;
      }

      try {
        const { data } = await api.get("/auth/verify-email", {
          params: { token },
        });

        setEmail(data.email);
        setState("success");
      } catch {
        setState("error");
      }
    };

    verify();
  }, [searchParams]);

  return (
    <main className="page">
      <div className="card" style={{ maxWidth: 520, marginTop: 20 }}>
        {state === "loading" && (
          <>
            <h1 className="title" style={{ marginBottom: 6 }}>Verifying...</h1>
            <p className="subtitle">Verifying your email…</p>
          </>
        )}

        {state === "success" && (
          <>
            <h1 className="title" style={{ marginBottom: 6 }}>Email Verified</h1>
            <p className="subtitle">
              {email ? <>{email} has</> : "Your email has"} been verified! You can now log in.
            </p>
            <p style={{ marginTop: 20 }}>
              <Link to="/login" className="btn" style={{ display: "inline-block" }}>
                Go to Login
              </Link>
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className="title" style={{ marginBottom: 6 }}>Verification Failed</h1>
            <p className="subtitle">This verification link is invalid or expired.</p>
            <p style={{ marginTop: 20 }}>
              <Link to="/login" className="btn" style={{ display: "inline-block" }}>
                Return to Login
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
