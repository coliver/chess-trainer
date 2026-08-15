import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../api";
import { login } from "../auth";

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setEmailNotVerified(false);
    setSubmitting(true);

    try {
      const { data } = await api.post("/auth/login", { username, password });

      login(data);

      navigate("/dashboard");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 403 && err.response?.data?.detail === "Email not verified") {
          setEmailNotVerified(true);
        } else {
          setError(err.response?.data?.detail || "Failed to Login");
        }
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    setVerificationSent(false);

    try {
      await api.post("/auth/resend-verification", { username });

      setVerificationSent(true);
      setTimeout(() => setVerificationSent(false), 3000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || "Failed to resend verification email");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setResendingVerification(false);
    }
  };

  return (
    <main className="page">
      <div className="card" style={{ maxWidth: 520, marginTop: 20 }}>
        <h1 className="title" style={{ marginBottom: 6 }}>Login</h1>
        <p className="subtitle">Welcome back.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span className="auth-label">Username</span>
            <input
              className="text-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </label>

          <label className="auth-field">
            <span className="auth-label">Password</span>
            <input
              className="text-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete="current-password"
            />
          </label>

          <button className="btn" disabled={submitting} type="submit" style={{ marginTop: 14 }}>
            {submitting ? "Submitting..." : "Submit"}
          </button>

          {emailNotVerified && (
            <div style={{ marginTop: 14 }}>
              <div className="auth-error">Please verify your email before logging in</div>
              <button
                className="btn"
                type="button"
                disabled={resendingVerification || verificationSent}
                onClick={handleResendVerification}
                style={{ marginTop: 10, opacity: verificationSent ? 0.6 : 1 }}
              >
                {verificationSent ? "Sent!" : resendingVerification ? "Sending..." : "Resend verification email"}
              </button>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}
        </form>

        <p className="auth-alt">
          Need an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </main>
  );
}
