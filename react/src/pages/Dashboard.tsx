// \frontend\src\pages\Dashboard.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useApiResource } from "../hooks/useApiResource";
import { useAuth } from "../hooks/useAuth";

import BoardPreview from "../components/openings/BoardPreview";
import OpeningCard from "../components/openings/OpeningCard";
import VariationList from "../components/openings/VariationList";
import { Button } from "../components/Button";
import { ProgressStat } from "../components/ProgressStat";
import {
  groupByBase,
  baseNameOf,
  colorOf,
  variationLabelOf,
  openingKey,
  type OpeningGroup,
} from "../lib/groupOpenings";
import { describeOpening } from "../data/openingText";

export type Opening = {
  name: string;
  eco: string;
  description?: string | null;
  uci_moves?: string | null;
  epd?: string | null;
};

const SEARCH_PAGE = 60;

type ProgressSummary = {
  positionsSeen: number;
  overallAccuracy: number;
  mastered: number;
  currentStreak: number;
  longestStreak: number;
};

type WeakSpot = {
  fen?: string | null;
  correctMoveUci?: string | null;
  openingEco?: string | null;
  openingName?: string | null;
  attempts: number;
  correctCount: number;
  incorrectCount: number;
};

type CommonWrongMove = {
  moveUci: string;
  count: number;
};

type StepAccuracy = {
  openingEco?: string | null;
  openingName?: string | null;
  orderIndex: number;
  correctMoveUci: string;
  attempts: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  commonWrongMoves: CommonWrongMove[];
};

type PuzzleSummary = {
  puzzlesSeen: number;
  overallAccuracy: number;
  mastered: number;
};

export const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { username } = useAuth();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const base =
      hour < 12
        ? t("header.greetingMorning")
        : hour < 18
          ? t("header.greetingAfternoon")
          : t("header.greetingEvening");
    const who = username ? `, ${username}` : "";
    const match = base.match(/(\p{Extended_Pictographic}️?)\s*$/u);
    if (!match) return { before: `${base}${who}`, emoji: "", who: "" };
    return {
      before: base.slice(0, match.index).trimEnd(),
      emoji: match[1],
      who,
    };
  }, [username, t]);

  const [openings, setOpenings] = useState<Opening[]>([]);
  const [query, setQuery] = useState("");
  const [activeBase, setActiveBase] = useState<string | null>(null);
  const [selected, setSelected] = useState<Opening | null>(null);
  const [playerColor, setPlayerColor] = useState<"w" | "b">("w");
  const [sortAZ, setSortAZ] = useState(false);
  const [colorFilter, setColorFilter] = useState<"all" | "w" | "b">("all");
  const [searchLimit, setSearchLimit] = useState(SEARCH_PAGE);
  const previewRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    api
      .get("/openings")
      .then((res) => {
        setOpenings(res.data ?? []);
        setQuery("");
        setActiveBase(null);
        setSelected(null);
      })
      .catch((e) => console.error("Error loading openings:", e));
  }, []);

  const summary = useApiResource<ProgressSummary | null>(
    "/progress/summary",
    null,
  );
  const dueList = useApiResource<unknown[]>("/progress/due", []);
  const dueCount = dueList.length;
  const weakSpotsAll = useApiResource<WeakSpot[]>("/progress/weak-spots", []);
  const weakSpots = useMemo(() => weakSpotsAll.slice(0, 5), [weakSpotsAll]);
  const stepAccuracyAll = useApiResource<StepAccuracy[]>(
    "/progress/step-accuracy",
    [],
  );
  const troubleSteps = useMemo(
    () => stepAccuracyAll.slice(0, 5),
    [stepAccuracyAll],
  );
  const puzzleSummary = useApiResource<PuzzleSummary | null>(
    "/puzzles/summary",
    null,
  );

  const groups = useMemo(() => groupByBase(openings), [openings]);

  const sortedGroups = useMemo(() => {
    if (!sortAZ) return groups; // groupByBase already sorts by popularity
    return [...groups].sort((a, b) => a.base.localeCompare(b.base));
  }, [groups, sortAZ]);

  const colorFilteredGroups = useMemo(() => {
    return sortedGroups.filter(
      (g) => colorFilter === "all" || colorOf(g.base) === colorFilter,
    );
  }, [sortedGroups, colorFilter]);

  const activeGroup: OpeningGroup | undefined = useMemo(
    () => groups.find((g) => g.base === activeBase),
    [groups, activeBase],
  );

  const q = query.trim().toLowerCase();
  const searchMatches = useMemo(() => {
    if (!q) return [];
    return openings.filter(
      (o) =>
        o.name.toLowerCase().includes(q) || o.eco.toLowerCase().includes(q),
    );
  }, [openings, q]);

  const view: "search" | "variations" | "bases" = q
    ? "search"
    : activeBase
      ? "variations"
      : "bases";

  const subText =
    view === "search"
      ? t("dashboard.openings.matches", { count: searchMatches.length })
      : view === "variations" && activeGroup
        ? t("dashboard.openings.variationsInLibrary", {
            count: activeGroup.count,
          })
        : t("dashboard.openings.openingsToTrain", {
            count: colorFilteredGroups.length,
          });

  const startSession = async (
    openingEco: string,
    openingName: string,
    playerColor: "w" | "b",
  ) => {
    try {
      const response = await api.post("/training-sessions", {
        openingEco,
        openingName,
        playerColor,
      });
      navigate(`/training/${response.data.id}`);
    } catch (error) {
      console.error("Error starting session:", error);
      alert(t("dashboard.progress.startSessionFailed"));
    }
  };

  const startReviewSession = async () => {
    try {
      const response = await api.post("/training-sessions/from-due");
      navigate(`/training/${response.data.id}`);
    } catch (error) {
      console.error("Error starting review session:", error);
      alert(t("dashboard.progress.reviewSessionFailed"));
    }
  };

  // Defaults the Play as White/Black toggle to match the opening's repertoire
  // color (e.g. a "X Defense" line defaults to Black) on every new selection,
  // while still leaving the toggle free for the user to override afterward.
  const selectOpening = (o: Opening) => {
    setSelected(o);
    setPlayerColor(colorOf(baseNameOf(o.name)));
  };

  const openBase = (group: OpeningGroup) => {
    setActiveBase(group.base);
    selectOpening(group.representative);
  };

  // Selecting a search result also anchors the active base, so clearing the
  // search returns to that opening's variation list (consistent with the
  // preview) rather than a stale, unrelated base.
  const pickFromSearch = (o: Opening) => {
    selectOpening(o);
    setActiveBase(baseNameOf(o.name));
  };

  const goHome = () => {
    setActiveBase(null);
  };

  // On narrow viewports the preview is CSS-reordered above the list (see
  // dashboard.css `.ob-preview { order: -1 }` under the 980px breakpoint),
  // but picking a variation from a long scrolled-down list doesn't move the
  // viewport there on its own. `block: "nearest"` keeps this a no-op on the
  // desktop side-by-side layout, where the preview is already visible.
  useEffect(() => {
    if (selected) {
      previewRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selected]);

  const startLabel = selected
    ? t("dashboard.openings.startLabel", {
        name:
          variationLabelOf(selected.name) === "Main line"
            ? baseNameOf(selected.name)
            : variationLabelOf(selected.name),
      })
    : t("dashboard.openings.chooseOpening");

  const previewFullName = selected
    ? variationLabelOf(selected.name) === "Main line"
      ? baseNameOf(selected.name)
      : `${baseNameOf(selected.name)}: ${variationLabelOf(selected.name)}`
    : "";

  return (
    <main className="page">
      <div className="dashboard-stack">
        <div role="heading" aria-level={1} className="dashboard-greeting">
          {greeting.before}
          {greeting.emoji && (
            <span className="dashboard-greeting-emoji"> {greeting.emoji}</span>
          )}
          {greeting.who}
        </div>
        <div className="card">
          <section
            className="progress-overview"
            aria-label={t("dashboard.progress.yourProgress")}
          >
            <div
              className="progress-group"
              aria-label={t("dashboard.progress.trainingLabel")}
            >
              <h2 className="progress-group-label">
                {t("dashboard.progress.trainingHeading")}
              </h2>
              <div className="progress-group-row">
                <ProgressStat
                  icon="♟️"
                  value={summary?.positionsSeen ?? 0}
                  label={t("dashboard.progress.positionsTrained")}
                />
                <ProgressStat
                  icon="🎯"
                  value={
                    summary?.overallAccuracy != null
                      ? `${Math.round(summary.overallAccuracy * 100)}%`
                      : "—"
                  }
                  label={t("dashboard.progress.accuracy")}
                />
                <ProgressStat
                  icon="📅"
                  value={
                    <>
                      {summary?.currentStreak ?? 0}
                      {(summary?.currentStreak ?? 0) > 0 ? " 🔥" : ""}
                    </>
                  }
                  label={
                    summary?.longestStreak
                      ? t("dashboard.progress.dayStreakBest", {
                          best: summary.longestStreak,
                        })
                      : t("dashboard.progress.dayStreak")
                  }
                />
                <ProgressStat
                  icon="🏆"
                  value={summary?.mastered ?? 0}
                  label={t("dashboard.progress.mastered")}
                  variant="mastery"
                >
                  {summary && summary.positionsSeen > 0 && (
                    <div className="mastery-bar" aria-hidden="true">
                      <div
                        className="mastery-bar-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (summary.mastered / summary.positionsSeen) * 100,
                            ),
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </ProgressStat>
                <div className="progress-stat">
                  <button
                    type="button"
                    className="progress-review-btn"
                    disabled={dueCount === 0}
                    onClick={startReviewSession}
                  >
                    {t("dashboard.progress.reviewDue", { count: dueCount })}
                  </button>
                </div>
              </div>
              {(weakSpots.length > 0 || troubleSteps.length > 0) && (
                <div className="progress-needs-work">
                  <span className="progress-stat-label">
                    {t("dashboard.progress.needsWork")}
                  </span>
                  {weakSpots.length > 0 && (
                    <div className="nw-row">
                      <span className="nw-row-label">
                        {t("dashboard.progress.needsWorkByOpening")}
                      </span>
                      <ul className="nw-chips">
                        {weakSpots.map((w) => {
                          const name =
                            w.openingName ??
                            t("dashboard.progress.weakSpotFallbackName");
                          const pct =
                            w.attempts > 0
                              ? Math.round((w.correctCount / w.attempts) * 100)
                              : 0;
                          const label = t("dashboard.progress.weakSpotItem", {
                            name,
                            correct: w.correctCount,
                            attempts: w.attempts,
                          });
                          return (
                            <li
                              key={`${w.openingName ?? "Opening"}-${w.fen ?? ""}-${w.correctMoveUci ?? ""}`}
                            >
                              <span className="nw-chip" title={label}>
                                <span aria-hidden="true">
                                  <span className="nw-chip-name">{name}</span>
                                  <span className="nw-chip-pct">{pct}%</span>
                                </span>
                                <span className="sr-only">{label}</span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {troubleSteps.length > 0 && (
                    <div className="nw-row">
                      <span className="nw-row-label">
                        {t("dashboard.progress.needsWorkByMove")}
                      </span>
                      <ul className="nw-chips">
                        {troubleSteps.map((s) => {
                          const name =
                            s.openingName ??
                            t("dashboard.progress.weakSpotFallbackName");
                          const moveNumber = Math.floor(s.orderIndex / 2) + 1;
                          const pct = Math.round(s.accuracy * 100);
                          const topWrongMove = s.commonWrongMoves[0];
                          const itemLabel = t(
                            "dashboard.progress.troubleSpotItem",
                            { name, move: moveNumber },
                          );
                          const wrongMoveLabel = topWrongMove
                            ? t("dashboard.progress.troubleSpotWrongMove", {
                                move: topWrongMove.moveUci,
                                count: topWrongMove.count,
                              })
                            : "";
                          const label = wrongMoveLabel
                            ? `${itemLabel} — ${wrongMoveLabel}`
                            : itemLabel;
                          return (
                            <li
                              key={`${s.openingName ?? "Opening"}-${s.openingEco ?? ""}-${s.orderIndex}`}
                            >
                              <span className="nw-chip" title={label}>
                                <span aria-hidden="true">
                                  <span className="nw-chip-name">
                                    {itemLabel}
                                  </span>
                                  <span className="nw-chip-pct">{pct}%</span>
                                </span>
                                {wrongMoveLabel && (
                                  <span className="sr-only">
                                    {wrongMoveLabel}
                                  </span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              className="progress-group progress-group--puzzles"
              aria-label={t("dashboard.progress.puzzleLabel")}
            >
              <h2 className="progress-group-label">
                {t("dashboard.progress.puzzlesHeading")}
              </h2>
              <div className="progress-group-row">
                <ProgressStat
                  icon="🧩"
                  value={puzzleSummary?.puzzlesSeen ?? 0}
                  label={t("dashboard.progress.puzzlesSolved")}
                />
                <ProgressStat
                  icon="🎯"
                  value={
                    puzzleSummary?.overallAccuracy != null &&
                    puzzleSummary.puzzlesSeen > 0
                      ? `${Math.round(puzzleSummary.overallAccuracy * 100)}%`
                      : "—"
                  }
                  label={t("dashboard.progress.accuracy")}
                />
                <ProgressStat
                  icon="🏆"
                  value={puzzleSummary?.mastered ?? 0}
                  label={t("dashboard.progress.mastered")}
                />
                <div className="progress-stat">
                  <button
                    type="button"
                    className="progress-review-btn"
                    onClick={() => navigate("/puzzles")}
                  >
                    {t("dashboard.progress.practicePuzzles")}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="opening-browser">
            <header className="ob-toolbar">
              <div className="ob-heading">
                <h1 className="ob-title">{t("dashboard.openings.title")}</h1>
                <p className="ob-sub">{subText}</p>
              </div>
              <span className="ob-grow" />
              <div className="ob-search">
                <span className="ob-search-icon" aria-hidden="true">
                  ⌕
                </span>
                <input
                  type="search"
                  aria-label={t("dashboard.openings.searchAriaLabel")}
                  placeholder={t("dashboard.openings.searchPlaceholder")}
                  value={query}
                  autoComplete="off"
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchLimit(SEARCH_PAGE);
                  }}
                />
              </div>
              {view === "bases" && (
                <>
                  <button
                    type="button"
                    className="ob-sort"
                    onClick={() => setSortAZ((s) => !s)}
                  >
                    {t("dashboard.openings.sortButton", {
                      mode: sortAZ
                        ? t("dashboard.openings.sortAZ")
                        : t("dashboard.openings.sortPopular"),
                    })}
                  </button>
                  <div
                    className="ob-color-filter"
                    role="radiogroup"
                    aria-label={t("dashboard.openings.filterByColor")}
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={colorFilter === "all"}
                      className={`ob-color-filter-btn${
                        colorFilter === "all" ? " selected" : ""
                      }`}
                      onClick={() => setColorFilter("all")}
                    >
                      {t("dashboard.openings.all")}
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={colorFilter === "w"}
                      className={`ob-color-filter-btn${
                        colorFilter === "w" ? " selected" : ""
                      }`}
                      onClick={() => setColorFilter("w")}
                    >
                      {t("dashboard.openings.white")}
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={colorFilter === "b"}
                      className={`ob-color-filter-btn${
                        colorFilter === "b" ? " selected" : ""
                      }`}
                      onClick={() => setColorFilter("b")}
                    >
                      {t("dashboard.openings.black")}
                    </button>
                  </div>
                </>
              )}
            </header>

            <div className="ob-body">
              <div className="ob-content">
                {view === "search" && (
                  <SearchResults
                    matches={searchMatches}
                    limit={searchLimit}
                    selectedKey={selected ? openingKey(selected) : null}
                    query={query}
                    onPick={pickFromSearch}
                    onMore={() => setSearchLimit((n) => n + SEARCH_PAGE)}
                  />
                )}

                {view === "variations" && activeGroup && (
                  <>
                    <nav
                      className="ob-crumbs"
                      aria-label={t("dashboard.openings.breadcrumb")}
                    >
                      <button type="button" onClick={goHome}>
                        {t("dashboard.openings.allOpenings")}
                      </button>
                      <span className="sep">/</span>
                      <span className="here">{activeGroup.base}</span>
                    </nav>
                    <VariationList
                      rows={activeGroup.members}
                      selectedKey={selected ? openingKey(selected) : null}
                      onPick={selectOpening}
                    />
                  </>
                )}

                {view === "bases" && (
                  <div className="opening-grid">
                    {colorFilteredGroups.map((g) => (
                      <OpeningCard
                        key={g.base}
                        group={g}
                        selected={
                          selected != null &&
                          baseNameOf(selected.name) === g.base
                        }
                        onSelect={() => openBase(g)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <aside
                ref={previewRef}
                className={`ob-preview${selected ? "" : " is-empty"}`}
              >
                {selected ? (
                  <div className="ob-preview-inner">
                    <BoardPreview
                      key={selected.name}
                      openings={[selected]}
                      selectedOpeningName={selected.name}
                      playerColor={playerColor}
                    />
                    <h2 className="pv-title">{previewFullName}</h2>
                    <p className="pv-eco">{selected.eco}</p>
                    <p className="opening-description">
                      {describeOpening(selected)}
                    </p>
                  </div>
                ) : (
                  <div className="ob-empty-state">
                    <span className="ob-empty-glyph" aria-hidden="true">
                      ♞
                    </span>
                    <p className="opening-description opening-description--empty">
                      {t("dashboard.openings.pickToPreview")}
                    </p>
                  </div>
                )}

                <div
                  className="ob-color-toggle"
                  role="radiogroup"
                  aria-label={t("dashboard.openings.playAs")}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={playerColor === "w"}
                    className={`ob-color-btn${playerColor === "w" ? " selected" : ""}`}
                    onClick={() => setPlayerColor("w")}
                  >
                    {t("dashboard.openings.playAsWhite")}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={playerColor === "b"}
                    className={`ob-color-btn${playerColor === "b" ? " selected" : ""}`}
                    onClick={() => setPlayerColor("b")}
                  >
                    {t("dashboard.openings.playAsBlack")}
                  </button>
                </div>

                <Button
                  className="tile-action ob-start"
                  type="button"
                  disabled={!selected}
                  onClick={() =>
                    selected &&
                    startSession(selected.eco, selected.name, playerColor)
                  }
                >
                  {startLabel}
                </Button>
              </aside>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

function SearchResults({
  matches,
  limit,
  selectedKey,
  query,
  onPick,
  onMore,
}: {
  matches: Opening[];
  limit: number;
  selectedKey: string | null;
  query: string;
  onPick: (o: Opening) => void;
  onMore: () => void;
}) {
  if (matches.length === 0) {
    return (
      <div className="ob-noresults">
        No openings match “{query.trim()}”.
        <br />
        Try a name (Sicilian) or an ECO code (B90).
      </div>
    );
  }
  const shown = matches.slice(0, limit);
  return (
    <>
      <div className="variation-rows" role="list">
        {shown.map((o) => (
          <button
            key={openingKey(o)}
            type="button"
            role="listitem"
            className={`variation-row${selectedKey === openingKey(o) ? " selected" : ""}`}
            onClick={() => onPick(o)}
            aria-pressed={selectedKey === openingKey(o)}
          >
            <span className="r-eco">{o.eco}</span>
            <span className="r-name">{o.name}</span>
          </button>
        ))}
      </div>
      {matches.length > limit && (
        <button type="button" className="ob-showmore" onClick={onMore}>
          Show {matches.length - limit} more
        </button>
      )}
    </>
  );
}
