import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import api from "../api";

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await api.post("/auth/register", { email, username, password });
      setSuccess(true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || "Failed to register. Please try again later.");
      } else {
        setError("Failed to register. Please try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page">
      <div className="card" style={{ maxWidth: 520, marginTop: 20 }}>
        <h1 className="title" style={{ marginBottom: 6 }}>Register</h1>
        <p className="subtitle">Create your account.</p>

        {success ? (
          <div>
            <p>Registration successful! Check your inbox at <strong>{email}</strong> for a verification link before logging in.</p>
            <p className="auth-alt" style={{ marginTop: 20 }}>
              <Link to="/login">Return to login</Link>
            </p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span className="auth-label">Email</span>
              <input
                className="text-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                autoComplete="email"
              />
            </label>

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
                autoComplete="new-password"
              />
            </label>

            <button className="btn" disabled={submitting} type="submit" style={{ marginTop: 6 }}>
              {submitting ? "Registering..." : "Register"}
            </button>

            {error && <div className="auth-error">{error}</div>}
          </form>
        )}

        <p className="auth-alt">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </main>
  );
}
