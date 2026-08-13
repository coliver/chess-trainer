import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../api";
import { login } from "../auth";

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { data } = await api.post("/auth/login", { username, password });

      login(data);

      navigate("/dashboard");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || "Failed to Login");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setSubmitting(false);
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

          {error && <div className="auth-error">{error}</div>}
        </form>
      </div>
    </main>
  );
}
