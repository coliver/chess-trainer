// react/src/components/OverflowMenu.tsx
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { logout } from "../auth";
import { useAuth } from "../hooks/useAuth";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "dev";

interface OverflowMenuProps {
  open: boolean;
  onClose: () => void;
}

export function OverflowMenu({ open, onClose }: OverflowMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  const { isLoggedIn } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
    onClose();
  };

  const handleSettingsClick = () => {
    navigate("/settings");
    onClose();
  };

  const handleGithubClick = () => {
    window.open("https://github.com/coliver/chess-trainer", "_blank");
    onClose();
  };

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overflow-menu" ref={menuRef}>
      <nav className="overflow-menu-items">
        {isLoggedIn && (
          <>
            <button
              className="overflow-menu-item"
              onClick={handleSettingsClick}
            >
              {t("header.settings")}
            </button>
            <button
              className="overflow-menu-item"
              onClick={handleLogout}
            >
              {t("header.logout")}
            </button>
          </>
        )}
        <a
          className="overflow-menu-item"
          href="https://github.com/coliver/chess-trainer"
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleGithubClick}
        >
          {t("header.viewSource")}
        </a>
        <div className="overflow-menu-divider" />
        <div className="overflow-menu-control">
          <span className="overflow-menu-label">Language</span>
          <LanguageToggle />
        </div>
        <div className="overflow-menu-control">
          <span className="overflow-menu-label">{t("theme.toggle")}</span>
          <ThemeToggle />
        </div>
        <div className="overflow-menu-divider" />
        <div className="overflow-menu-footer">
          <span className="overflow-menu-version">{APP_VERSION}</span>
        </div>
      </nav>
    </div>
  );
}
