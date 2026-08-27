// react/src/components/GameHeader.tsx
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Settings } from "lucide-react";
import { useGameHeader } from "../context/GameHeaderContext";

export function GameHeader() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, onSettingsClick } = useGameHeader();

  const handleBack = () => {
    navigate("/dashboard");
  };

  const handleSettings = () => {
    if (onSettingsClick) {
      onSettingsClick();
    } else {
      navigate("/settings", { state: { from: location.pathname } });
    }
  };

  return (
    <header className="game-header">
      <div className="game-header-inner">
        <button
          className="game-header-back"
          onClick={handleBack}
          aria-label="Back"
          title="Back to dashboard"
        >
          <ChevronLeft size={24} aria-hidden="true" />
        </button>

        <div className="game-header-status">{status || ""}</div>

        <button
          className="game-header-settings"
          onClick={handleSettings}
          aria-label={t("header.settings")}
          title={t("header.settings")}
        >
          <Settings size={24} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
