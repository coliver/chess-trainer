import { useState } from "react";

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
    } catch (err) {
      setError("Failed to register. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{ maxWidth: 420, margin: "40px auto", fontFamily: "sans-serif" }}
    >
      <h1>Register</h1>

      {success ? (
        <p>Registered—now log in.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>

          <label style={{ display: "block", marginTop: 12 }}>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>

          <label style={{ display: "block", marginTop: 12 }}>
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>

          <button disabled={submitting} type="submit" style={{ marginTop: 16 }}>
            {submitting ? "Registering..." : "Register"}
          </button>

          {error && (
            <div
              style={{
                marginTop: 12,
                color: "crimson",
                whiteSpace: "pre-wrap",
              }}
            >
              {error}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
