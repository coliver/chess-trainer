// frontend/src/components/Header.tsx
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { KnightSchoolIcon } from "./KnightSchoolIcon";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { useNavigate } from "react-router-dom";
import { logout } from "../auth";
import { useAuth } from "../hooks/useAuth";

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
          <KnightSchoolIcon height="64px" className="site-header-logo" />
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
                <Link to="/dashboard" className={`site-header-nav-link${location.pathname.startsWith("/dashboard") ? " active" : ""}`}>
                  {t("header.openings")}
                </Link>
                <Link to="/puzzles" className={`site-header-nav-link${location.pathname.startsWith("/puzzles") ? " active" : ""}`}>
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
                  <svg
                    width={22}
                    height={22}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                </Link>
                <Link
                  to="/register"
                  className="site-header-profile-link"
                  aria-label={t("header.register")}
                  title={t("header.register")}
                >
                  <svg
                    width={22}
                    height={22}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="17" y1="11" x2="23" y2="11" />
                  </svg>
                </Link>
              </>
            ) : (
              <button
                className="site-header-profile-link"
                onClick={onLogout}
                aria-label={t("header.logout")}
                title={t("header.logout")}
              >
                <svg
                  width={22}
                  height={22}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
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
                  width={22}
                  height={22}
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
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
