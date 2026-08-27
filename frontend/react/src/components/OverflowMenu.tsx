// react/src/components/OverflowMenu.tsx
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import { logout } from "../auth";
import { useAuth } from "../hooks/useAuth";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "dev";

interface OverflowMenuProps {
  open: boolean;
  onClose: () => void;
  triggerRef?: RefObject<HTMLElement | null>;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function OverflowMenu({ open, onClose, triggerRef }: OverflowMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLElement>(null);

  const { isLoggedIn } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
    onClose();
  };

  const handleSettingsClick = () => {
    navigate("/settings", { state: { from: location.pathname } });
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

  // Focus the menu on open, return focus to the trigger on close, and trap
  // focus + handle Escape while open so keyboard/screen-reader users can't
  // tab into the page behind this modal-like overlay.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const trigger = triggerRef?.current;
    const firstItem = menuRef.current?.querySelector<HTMLElement>(
      FOCUSABLE_SELECTOR,
    );
    firstItem?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !menuRef.current) return;

      const focusable = Array.from(
        menuRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      (trigger ?? previouslyFocused)?.focus();
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return createPortal(
    <div className="overflow-menu" data-testid="overflow-menu-backdrop">
      <nav
        className="overflow-menu-items"
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("header.nav")}
      >
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
    </div>,
    document.body,
  );
}
