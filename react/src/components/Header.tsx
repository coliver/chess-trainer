// frontend/src/components/Header.tsx
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { KnightSchoolIcon } from "./KnightSchoolIcon";
import { ThemeToggle } from "./ThemeToggle";
import { useNavigate } from "react-router-dom";
import { logout, AUTH_CHANGED_EVENT } from "../auth";

export default function Header() {
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem("token"),
  );

  useEffect(() => {
    const syncFromStorage = () =>
      setIsLoggedIn(!!localStorage.getItem("token"));

    // "storage" only fires for other tabs/documents; AUTH_CHANGED_EVENT
    // covers same-tab login/logout (see auth.ts).
    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(AUTH_CHANGED_EVENT, syncFromStorage);

    syncFromStorage();

    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(AUTH_CHANGED_EVENT, syncFromStorage);
    };
  }, []);

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  const username = localStorage.getItem("username");
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const base =
      hour < 12
        ? "Good morning ☀️"
        : hour < 18
          ? "Good afternoon 🌤️"
          : "Good evening 🌙";
    const who = username ? `, ${username}` : "";
    return `${base}${who}`;
  }, [username]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="site-header-brand">
          <KnightSchoolIcon height="64px" className="site-header-logo" />
          <Link to="/dashboard" className="site-header-title">
            Knight&nbsp;School
          </Link>
        </div>

        <div className="site-header-right">
          <div role="heading" className="site-header-greeting">
            {greeting}
          </div>

          <nav className="site-header-nav" aria-label="Primary">
            {!isLoggedIn ? (
              <>
                <Link to="/login" className="site-header-link">
                  Login
                </Link>
                <Link to="/register" className="site-header-link">
                  Register
                </Link>
              </>
            ) : (
              <button
                className="site-header-profile-link"
                onClick={onLogout}
                aria-label="Logout"
                title="Logout"
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
                aria-label="View source on GitHub"
                title="View source on GitHub"
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
              <ThemeToggle />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
