import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { usePreferences } from "../context/PreferencesContext";
import { useSnowPreference } from "../hooks/useSnowPreference";
import { useSound } from "../hooks/useSound";
import { getMoveSound } from "../utils/sound";
import { LanguageToggle } from "../components/LanguageToggle";
import { Button } from "../components/Button";
import { SettingsToggleRow } from "../components/SettingsToggleRow";
import { SettingsRadioGroup } from "../components/SettingsRadioGroup";
import Board from "../components/Board";
import { START_FEN, applyMove, legalMoves } from "@knight-school/chess-core";
import type {
  BoardOrientationMode,
  BoardTheme,
  PieceSet,
  Theme,
} from "../preferences";

const BOARD_THEMES: BoardTheme[] = [
  "default",
  "default-contrast",
  "green",
  "blue",
  "chess-club",
  "chessboard-js",
  "black-and-white",
];

const PIECE_SETS: PieceSet[] = [
  "standard",
  "staunty",
  "merida",
  "pirouetti",
  "chessnut",
];

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = (location.state as { from?: string } | null)?.from ?? "/dashboard";
  const { preferences, update, reset } = usePreferences();
  const { snowEnabled, setSnowEnabled } = useSnowPreference();
  const { play } = useSound();
  const [previewFen, setPreviewFen] = useState(START_FEN);

  const previewGetLegalMoves = useCallback(
    (square: string) => legalMoves(previewFen, square),
    [previewFen],
  );

  const previewOnMove = useCallback(
    (from: string, to: string): boolean => {
      if (!from || !to || from === to) return false;
      const result = applyMove(previewFen, from, to, `${from}${to}q`);
      if (!result) return false;
      play(getMoveSound(previewFen, result.uci));
      setPreviewFen(result.nextFen);
      return true;
    },
    [previewFen, play],
  );

  const handleReset = useCallback(() => {
    if (!window.confirm(t("settings.resetConfirm"))) return;
    reset();
    setSnowEnabled(false);
  }, [reset, setSnowEnabled, t]);

  return (
    <main className="page">
      <div className="card settings-card">
        <button
          type="button"
          className="settings-back-button"
          onClick={() => navigate(backTo)}
          aria-label="Back"
        >
          <ChevronLeft size={18} aria-hidden="true" />
          Back
        </button>
        <h1 className="title">{t("settings.title")}</h1>
        <p className="subtitle">{t("settings.subtitle")}</p>

        <section className="settings-section settings-section--preview">
          <span className="settings-row-label">
            {t("settings.previewLabel")}
          </span>
          <div className="settings-preview-board">
            <Board
              position={previewFen}
              orientation={
                preferences.board_orientation_mode === "black"
                  ? "black"
                  : "white"
              }
              interactive
              moveColor={previewFen.split(" ")[1] === "b" ? "black" : "white"}
              getLegalMoves={previewGetLegalMoves}
              onMove={previewOnMove}
            />
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-row">
            <span className="settings-row-label">
              {t("settings.languageLabel")}
            </span>
            <LanguageToggle />
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-heading">
            {t("settings.appearance.heading")}
          </h2>

          <SettingsRadioGroup
            name="theme"
            ariaLabel={t("settings.appearance.themeLabel")}
            rowLabel={t("settings.appearance.themeLabel")}
            value={preferences.theme}
            options={(["light", "dark", "system"] as Theme[]).map((theme) => ({
              value: theme,
              label: t(`theme.${theme}`),
            }))}
            onChange={(theme) => update({ theme })}
          />

          <label className="settings-row" htmlFor="settings-board-theme">
            <span className="settings-row-label">
              {t("settings.appearance.boardThemeLabel")}
            </span>
            <select
              id="settings-board-theme"
              className="text-input settings-select"
              value={preferences.board_theme}
              onChange={(e) =>
                update({ board_theme: e.target.value as BoardTheme })
              }
            >
              {BOARD_THEMES.map((boardTheme) => (
                <option key={boardTheme} value={boardTheme}>
                  {t(`settings.boardThemes.${boardTheme}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-row" htmlFor="settings-piece-set">
            <span className="settings-row-label">
              {t("settings.appearance.pieceSetLabel")}
            </span>
            <select
              id="settings-piece-set"
              className="text-input settings-select"
              value={preferences.piece_set}
              onChange={(e) =>
                update({ piece_set: e.target.value as PieceSet })
              }
            >
              {PIECE_SETS.map((pieceSet) => (
                <option key={pieceSet} value={pieceSet}>
                  {t(`settings.pieceSets.${pieceSet}`)}
                </option>
              ))}
            </select>
          </label>

          <SettingsToggleRow
            label={t("settings.appearance.showCoordinatesLabel")}
            checked={preferences.show_coordinates}
            onChange={(checked) => update({ show_coordinates: checked })}
          />

          <SettingsToggleRow
            label={t("settings.appearance.boardAnimationsLabel")}
            checked={preferences.board_animations}
            onChange={(checked) => update({ board_animations: checked })}
          />

          <SettingsToggleRow
            label={t("settings.appearance.soundLabel")}
            checked={preferences.sound}
            onChange={(checked) => update({ sound: checked })}
          />

          <SettingsToggleRow
            label={t("settings.appearance.snowLabel")}
            checked={snowEnabled}
            onChange={setSnowEnabled}
          />
        </section>

        <section className="settings-section">
          <h2 className="settings-section-heading">
            {t("settings.boardOrientation.heading")}
          </h2>
          <SettingsRadioGroup
            name="board-orientation-mode"
            ariaLabel={t("settings.boardOrientation.heading")}
            stacked
            value={preferences.board_orientation_mode}
            options={(["auto", "white", "black"] as BoardOrientationMode[]).map(
              (mode) => ({
                value: mode,
                label: t(`settings.boardOrientation.${mode}`),
              }),
            )}
            onChange={(mode) => update({ board_orientation_mode: mode })}
          />
        </section>

        <section className="settings-section settings-section--footer">
          <Button variant="secondary" onClick={handleReset}>
            {t("settings.resetToDefaults")}
          </Button>
        </section>
      </div>
    </main>
  );
}
