// react/src/pages/PuzzleThemes.tsx
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useApiResource } from "../hooks/useApiResource";
import { formatThemeLabel, THEME_GROUPS } from "../utils/puzzleThemes";

type ThemeCount = { theme: string; count: number };

export const PuzzleThemes = () => {
  const { t } = useTranslation();
  const themeCounts = useApiResource<ThemeCount[]>("/puzzles/themes", []);

  const countByTheme = useMemo(
    () => new Map(themeCounts.map((tc) => [tc.theme, tc.count])),
    [themeCounts],
  );

  return (
    <main className="page">
      <div className="card">
        <div className="puzzle-themes-head">
          <div className="rail-eyebrow">{t("puzzleThemes.eyebrow")}</div>
          <h1>{t("puzzleThemes.title")}</h1>
          <p className="puzzle-themes-subtitle">{t("puzzleThemes.subtitle")}</p>
        </div>

        {THEME_GROUPS.map((group) => {
          const themes = group.themes.filter((theme) => countByTheme.has(theme));
          if (themes.length === 0) return null;

          return (
            <section key={group.key} className="puzzle-theme-group">
              <h2 className="puzzle-theme-group-title">
                {t(`puzzleThemes.${group.key}`)}
              </h2>
              <div className="puzzle-theme-grid">
                {themes.map((theme) => (
                  <Link
                    key={theme}
                    to={`/puzzles?theme=${theme}`}
                    className="puzzle-theme-card"
                  >
                    <span className="puzzle-theme-card-name">
                      {formatThemeLabel(theme)}
                    </span>
                    <span className="puzzle-theme-card-count">
                      {t("puzzleThemes.cardCount", { count: countByTheme.get(theme) })}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <Link to="/puzzles" className="puzzles-back-link">
          {t("puzzleThemes.backToPuzzles")}
        </Link>
      </div>
    </main>
  );
};

export default PuzzleThemes;
