import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../api";
import { login } from "../auth";
import { AuthCard } from "../components/AuthCard";
import { apiErrorMessage } from "../utils/apiError";

export default function Login() {
  const { t } = useTranslation();
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
      if (
        axios.isAxiosError(err) &&
        err.response?.status === 403 &&
        err.response?.data?.detail === "Email not verified"
      ) {
        setEmailNotVerified(true);
      } else {
        setError(
          apiErrorMessage(
            err,
            t("auth.login.errorLoginFailed"),
            t("auth.login.errorGeneric"),
          ),
        );
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
      setError(
        apiErrorMessage(
          err,
          t("auth.login.errorResendFailed"),
          t("auth.login.errorGeneric"),
        ),
      );
    } finally {
      setResendingVerification(false);
    }
  };

  return (
    <AuthCard title={t("auth.login.title")} subtitle={t("auth.login.subtitle")}>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span className="auth-label">{t("auth.login.usernameLabel")}</span>
          <input
            className="text-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        </label>

        <label className="auth-field">
          <span className="auth-label">{t("auth.login.passwordLabel")}</span>
          <input
            className="text-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            autoComplete="current-password"
          />
        </label>

        <button
          className="btn"
          disabled={submitting}
          type="submit"
          style={{ marginTop: 14 }}
        >
          {submitting ? t("auth.login.submitting") : t("auth.login.submit")}
        </button>

        {emailNotVerified && (
          <div style={{ marginTop: 14 }}>
            <div className="auth-error" role="alert">
              {t("auth.login.emailNotVerified")}
            </div>
            <button
              className="btn"
              type="button"
              disabled={resendingVerification || verificationSent}
              onClick={handleResendVerification}
              style={{ marginTop: 10, opacity: verificationSent ? 0.6 : 1 }}
            >
              {verificationSent
                ? t("auth.login.resendSent")
                : resendingVerification
                  ? t("auth.login.resendSending")
                  : t("auth.login.resendVerification")}
            </button>
          </div>
        )}

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}
      </form>

      <p className="auth-alt">
        {t("auth.login.needAccount")}{" "}
        <Link to="/register">{t("auth.login.registerLink")}</Link>
      </p>
    </AuthCard>
  );
}
