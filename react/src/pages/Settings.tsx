import { useTranslation } from "react-i18next";
import { usePreferences } from "../context/PreferencesContext";
import { LanguageToggle } from "../components/LanguageToggle";
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

const PIECE_SETS: PieceSet[] = ["standard", "staunty"];

export default function Settings() {
  const { t } = useTranslation();
  const { preferences, update } = usePreferences();

  return (
    <main className="page">
      <div className="card settings-card">
        <h1 className="title">{t("settings.title")}</h1>
        <p className="subtitle">{t("settings.subtitle")}</p>

        <section className="settings-section">
          <div className="settings-row">
            <span className="settings-row-label">{t("settings.languageLabel")}</span>
            <LanguageToggle />
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-heading">{t("settings.appearance.heading")}</h2>

          <div className="settings-row">
            <span className="settings-row-label">{t("settings.appearance.themeLabel")}</span>
            <div className="settings-radio-group" role="radiogroup" aria-label={t("settings.appearance.themeLabel")}>
              {(["light", "dark", "system"] as Theme[]).map((theme) => (
                <label key={theme} className="settings-radio">
                  <input
                    type="radio"
                    name="theme"
                    value={theme}
                    checked={preferences.theme === theme}
                    onChange={() => update({ theme })}
                  />
                  {t(`theme.${theme}`)}
                </label>
              ))}
            </div>
          </div>

          <label className="settings-row" htmlFor="settings-board-theme">
            <span className="settings-row-label">{t("settings.appearance.boardThemeLabel")}</span>
            <select
              id="settings-board-theme"
              className="text-input settings-select"
              value={preferences.board_theme}
              onChange={(e) => update({ board_theme: e.target.value as BoardTheme })}
            >
              {BOARD_THEMES.map((boardTheme) => (
                <option key={boardTheme} value={boardTheme}>
                  {t(`settings.boardThemes.${boardTheme}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-row" htmlFor="settings-piece-set">
            <span className="settings-row-label">{t("settings.appearance.pieceSetLabel")}</span>
            <select
              id="settings-piece-set"
              className="text-input settings-select"
              value={preferences.piece_set}
              onChange={(e) => update({ piece_set: e.target.value as PieceSet })}
            >
              {PIECE_SETS.map((pieceSet) => (
                <option key={pieceSet} value={pieceSet}>
                  {t(`settings.pieceSets.${pieceSet}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-row settings-row--checkbox">
            <span className="settings-row-label">{t("settings.appearance.showCoordinatesLabel")}</span>
            <input
              type="checkbox"
              checked={preferences.show_coordinates}
              onChange={(e) => update({ show_coordinates: e.target.checked })}
            />
          </label>

          <label className="settings-row settings-row--checkbox">
            <span className="settings-row-label">{t("settings.appearance.boardAnimationsLabel")}</span>
            <input
              type="checkbox"
              checked={preferences.board_animations}
              onChange={(e) => update({ board_animations: e.target.checked })}
            />
          </label>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-heading">{t("settings.boardOrientation.heading")}</h2>
          <div
            className="settings-radio-group settings-radio-group--stacked"
            role="radiogroup"
            aria-label={t("settings.boardOrientation.heading")}
          >
            {(["auto", "white", "black"] as BoardOrientationMode[]).map((mode) => (
              <label key={mode} className="settings-radio">
                <input
                  type="radio"
                  name="board-orientation-mode"
                  value={mode}
                  checked={preferences.board_orientation_mode === mode}
                  onChange={() => update({ board_orientation_mode: mode })}
                />
                {t(`settings.boardOrientation.${mode}`)}
              </label>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
