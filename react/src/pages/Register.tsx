import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import axios from "axios";
import api from "../api";

export default function Register() {
  const { t } = useTranslation();
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
        setError(err.response?.data?.detail || t("auth.register.errorGeneric"));
      } else {
        setError(t("auth.register.errorGeneric"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page">
      <div className="card" style={{ maxWidth: 520, marginTop: 20 }}>
        <h1 className="title" style={{ marginBottom: 6 }}>{t("auth.register.title")}</h1>
        <p className="subtitle">{t("auth.register.subtitle")}</p>

        {success ? (
          <div>
            <p>
              <Trans
                i18nKey="auth.register.successMessage"
                values={{ email }}
                components={{ strong: <strong /> }}
              />
            </p>
            <p className="auth-alt" style={{ marginTop: 20 }}>
              <Link to="/login">{t("auth.register.returnToLogin")}</Link>
            </p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span className="auth-label">{t("auth.register.emailLabel")}</span>
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
              <span className="auth-label">{t("auth.register.usernameLabel")}</span>
              <input
                className="text-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </label>

            <label className="auth-field">
              <span className="auth-label">{t("auth.register.passwordLabel")}</span>
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
              {submitting ? t("auth.register.submitting") : t("auth.register.submit")}
            </button>

            {error && <div className="auth-error">{error}</div>}
          </form>
        )}

        <p className="auth-alt">
          {t("auth.register.haveAccount")} <Link to="/login">{t("auth.register.loginLink")}</Link>
        </p>
      </div>
    </main>
  );
}
