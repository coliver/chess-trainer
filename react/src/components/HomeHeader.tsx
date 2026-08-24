// react/src/components/HomeHeader.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { KnightSchoolIcon } from "./KnightSchoolIcon";
import { OverflowMenu } from "./OverflowMenu";

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "header.greetingMorning";
  if (hour < 18) return "header.greetingAfternoon";
  return "header.greetingEvening";
}

export function HomeHeader() {
  const { t } = useTranslation();
  const location = useLocation();
  const { isLoggedIn, username } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isOpeningsActive = location.pathname.startsWith("/dashboard");
  const isPuzzlesActive = location.pathname.startsWith("/puzzles");

  return (
    <header className="home-header">
      <div className="home-header-inner">
        {/* Logo + Title row */}
        <div className="home-header-top">
          <div className="home-header-branding">
            <KnightSchoolIcon height="24px" className="home-header-icon" />
            <span className="home-header-title-text">
              {t("header.title")}
            </span>
          </div>
          <button
            className="home-header-menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            ⋮
          </button>
          <OverflowMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
        </div>

        {/* Greeting + Tabs row */}
        {isLoggedIn && (
          <div className="home-header-bottom">
            <div className="home-header-greeting">
              {t(getGreetingKey())}, {username || ""}
            </div>
            {(isOpeningsActive || isPuzzlesActive) && (
              <nav className="home-header-tabs">
                <Link
                  to="/dashboard"
                  className={`home-header-tab${
                    isOpeningsActive ? " active" : ""
                  }`}
                >
                  {t("header.openings")}
                </Link>
                <Link
                  to="/puzzles"
                  className={`home-header-tab${isPuzzlesActive ? " active" : ""}`}
                >
                  {t("header.puzzles")}
                </Link>
              </nav>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
