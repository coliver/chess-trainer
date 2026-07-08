import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

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
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!resp.ok) {
        setError(await resp.text());
        return;
      }

      setSuccess(true);
      navigate("/dashboard");
      
    } catch (err) {
      setError("Failed to Login. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{ maxWidth: 420, margin: "40px auto", fontFamily: "sans-serif" }}
    >
      <h1>Login</h1>


      <form onSubmit={handleSubmit}>
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
          {submitting ? "Submitting..." : "Submit"}
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
    </div>
  );
}
