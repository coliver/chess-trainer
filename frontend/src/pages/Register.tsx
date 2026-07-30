import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

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
      const resp = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });

      if (!resp.ok) {
        setError(await resp.text());
        return;
      }

      setSuccess(true);
      navigate("/login");
    } catch (err) {
      setError("Failed to register. Please try again later.");
      console.error(err)
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
          <p>Registered—now log in.</p>
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
      </div>
    </main>
  );
}
