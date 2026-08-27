import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";
import { AuthCard } from "../components/AuthCard";

type VerificationState = "loading" | "success" | "error";

export default function VerifyEmail() {
  const { t } = useTranslation();
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
    <AuthCard>
      {state === "loading" && (
        <>
          <h1 className="title" style={{ marginBottom: 6 }}>
            {t("auth.verifyEmail.loadingTitle")}
          </h1>
          <p className="subtitle">{t("auth.verifyEmail.loadingSubtitle")}</p>
        </>
      )}

      {state === "success" && (
        <>
          <h1 className="title" style={{ marginBottom: 6 }}>
            {t("auth.verifyEmail.successTitle")}
          </h1>
          <p className="subtitle">
            {email
              ? t("auth.verifyEmail.successSubtitleWithEmail", { email })
              : t("auth.verifyEmail.successSubtitleNoEmail")}
          </p>
          <p style={{ marginTop: 20 }}>
            <Link
              to="/login"
              className="btn"
              style={{ display: "inline-block" }}
            >
              {t("auth.verifyEmail.goToLogin")}
            </Link>
          </p>
        </>
      )}

      {state === "error" && (
        <>
          <h1 className="title" style={{ marginBottom: 6 }}>
            {t("auth.verifyEmail.errorTitle")}
          </h1>
          <p className="subtitle">{t("auth.verifyEmail.errorSubtitle")}</p>
          <p style={{ marginTop: 20 }}>
            <Link
              to="/login"
              className="btn"
              style={{ display: "inline-block" }}
            >
              {t("auth.verifyEmail.returnToLogin")}
            </Link>
          </p>
        </>
      )}
    </AuthCard>
  );
}
