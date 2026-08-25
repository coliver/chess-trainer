// react/src/components/HomeHeader.tsx
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { KnightSchoolIcon } from "./KnightSchoolIcon";
import { OverflowMenu } from "./OverflowMenu";

export function HomeHeader() {
  const { t } = useTranslation();
  const location = useLocation();
  const { isLoggedIn } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const isOpeningsActive = location.pathname.startsWith("/dashboard");
  const isPuzzlesActive = location.pathname.startsWith("/puzzles");

  return (
    <header className="home-header">
      <div className="home-header-inner">
        <div className="home-header-top">
          <div className="home-header-brand-group">
            <button
              ref={menuButtonRef}
              className="home-header-menu-button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            <div className="home-header-branding">
              <KnightSchoolIcon height="24px" className="home-header-icon" />
              <span className="home-header-title-text">
                {t("header.title")}
              </span>
            </div>
          </div>

          {isLoggedIn && (isOpeningsActive || isPuzzlesActive) && (
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
                to="/puzzles/themes"
                className={`home-header-tab${isPuzzlesActive ? " active" : ""}`}
              >
                {t("header.puzzles")}
              </Link>
            </nav>
          )}

          <OverflowMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            triggerRef={menuButtonRef}
          />
        </div>
      </div>
    </header>
  );
}
