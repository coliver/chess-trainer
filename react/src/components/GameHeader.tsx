// react/src/components/GameHeader.tsx
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Settings } from "lucide-react";
import { useGameHeader } from "../context/GameHeaderContext";

export function GameHeader() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { status, onSettingsClick } = useGameHeader();

  const handleBack = () => {
    navigate("/dashboard");
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
          onClick={onSettingsClick}
          aria-label={t("header.settings")}
          title={t("header.settings")}
        >
          <Settings size={24} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
