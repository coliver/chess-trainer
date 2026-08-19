// frontend/src/components/Header.tsx
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn, UserPlus, LogOut } from "lucide-react";
import { KnightSchoolIcon } from "./KnightSchoolIcon";
import { ThemeToggle } from "./ThemeToggle";
import { logout } from "../auth";
import { useAuth } from "../hooks/useAuth";
import { LanguageToggle } from "./LanguageToggle";

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "dev";

export default function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, username } = useAuth();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const base =
      hour < 12
        ? t("header.greetingMorning")
        : hour < 18
          ? t("header.greetingAfternoon")
          : t("header.greetingEvening");
    const who = username ? `, ${username}` : "";
    return `${base}${who}`;
  }, [username, t]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="site-header-brand">
          <div className="site-header-logo-stack">
            <KnightSchoolIcon height="64px" className="site-header-logo" />
            <span className="site-header-version" data-testid="app-version">
              {APP_VERSION}
            </span>
          </div>
          <Link to="/dashboard" className="site-header-title">
            {t("header.title")}
          </Link>
        </div>

        <div className="site-header-right">
          <div role="heading" className="site-header-greeting">
            {greeting}
          </div>

          <nav className="site-header-nav" aria-label={t("header.nav")}>
            {isLoggedIn && (
              <>
                <Link
                  to="/dashboard"
                  className={`site-header-nav-link${location.pathname.startsWith("/dashboard") ? " active" : ""}`}
                >
                  {t("header.openings")}
                </Link>
                <Link
                  to="/puzzles"
                  className={`site-header-nav-link${location.pathname.startsWith("/puzzles") ? " active" : ""}`}
                >
                  {t("header.puzzles")}
                </Link>
              </>
            )}

            {!isLoggedIn ? (
              <>
                <Link
                  to="/login"
                  className="site-header-profile-link"
                  aria-label={t("header.login")}
                  title={t("header.login")}
                >
                  <LogIn size={22} aria-hidden="true" />
                </Link>
                <Link
                  to="/register"
                  className="site-header-profile-link"
                  aria-label={t("header.register")}
                  title={t("header.register")}
                >
                  <UserPlus size={22} aria-hidden="true" />
                </Link>
              </>
            ) : (
              <button
                className="site-header-profile-link"
                onClick={onLogout}
                aria-label={t("header.logout")}
                title={t("header.logout")}
              >
                <LogOut size={22} aria-hidden="true" />
              </button>
            )}

            <div className="site-header-actions">
              <a
                href="https://github.com/coliver/chess-trainer"
                className="site-header-profile-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("header.viewSource")}
                title={t("header.viewSource")}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2C6.477 2 2 6.58 2 12.239c0 4.526 2.865 8.367 6.839 9.72.5.094.682-.22.682-.489 0-.242-.01-.882-.014-1.731-2.782.62-3.369-1.376-3.369-1.376-.455-1.188-1.11-1.504-1.11-1.504-.908-.636.069-.623.069-.623 1.004.072 1.532 1.05 1.532 1.05.892 1.561 2.341 1.11 2.91.848.091-.662.35-1.11.636-1.365-2.22-.258-4.555-1.134-4.555-5.04 0-1.113.39-2.024 1.029-2.738-.103-.259-.446-1.3.098-2.708 0 0 .84-.275 2.75 1.047A9.3 9.3 0 0 1 12 6.844c.85.004 1.705.116 2.504.34 1.909-1.322 2.747-1.047 2.747-1.047.546 1.408.202 2.449.1 2.708.64.714 1.028 1.625 1.028 2.738 0 3.916-2.339 4.778-4.566 5.03.36.313.678.93.678 1.874 0 1.353-.012 2.443-.012 2.774 0 .272.18.587.688.487A10.246 10.246 0 0 0 22 12.239C22 6.58 17.523 2 12 2Z" />
                </svg>
              </a>
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
