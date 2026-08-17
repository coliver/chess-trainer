// \frontend\src\pages\Dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useApiResource } from "../hooks/useApiResource";

import BoardPreview from "../components/openings/BoardPreview";
import OpeningCard from "../components/openings/OpeningCard";
import VariationList from "../components/openings/VariationList";
import { Button } from "../components/Button";
import {
  groupByBase,
  baseNameOf,
  variationLabelOf,
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

type PuzzleSummary = {
  puzzlesSeen: number;
  overallAccuracy: number;
  mastered: number;
};

export const Dashboard = () => {
  const navigate = useNavigate();

  const [openings, setOpenings] = useState<Opening[]>([]);
  const [query, setQuery] = useState("");
  const [activeBase, setActiveBase] = useState<string | null>(null);
  const [selected, setSelected] = useState<Opening | null>(null);
  const [playerColor, setPlayerColor] = useState<"w" | "b">("w");
  const [sortAZ, setSortAZ] = useState(false);
  const [searchLimit, setSearchLimit] = useState(SEARCH_PAGE);

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
  const puzzleSummary = useApiResource<PuzzleSummary | null>(
    "/puzzles/summary",
    null,
  );

  const groups = useMemo(() => groupByBase(openings), [openings]);

  const sortedGroups = useMemo(() => {
    if (!sortAZ) return groups; // groupByBase already sorts by popularity
    return [...groups].sort((a, b) => a.base.localeCompare(b.base));
  }, [groups, sortAZ]);

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
      ? `${searchMatches.length} match${searchMatches.length === 1 ? "" : "es"}`
      : view === "variations" && activeGroup
        ? `${activeGroup.count} variations in the full library`
        : `${groups.length} openings · pick one to train`;

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
      alert("Failed to start session. Check your connection or token.");
    }
  };

  const startReviewSession = async () => {
    try {
      const response = await api.post("/training-sessions/from-due");
      navigate(`/training/${response.data.id}`);
    } catch (error) {
      console.error("Error starting review session:", error);
      alert("No positions due for review yet.");
    }
  };

  const openBase = (group: OpeningGroup) => {
    setActiveBase(group.base);
    setSelected(group.representative);
  };

  // Selecting a search result also anchors the active base, so clearing the
  // search returns to that opening's variation list (consistent with the
  // preview) rather than a stale, unrelated base.
  const pickFromSearch = (o: Opening) => {
    setSelected(o);
    setActiveBase(baseNameOf(o.name));
  };

  const goHome = () => {
    setActiveBase(null);
  };

  const startLabel = selected
    ? `Start ${
        variationLabelOf(selected.name) === "Main line"
          ? baseNameOf(selected.name)
          : variationLabelOf(selected.name)
      }`
    : "Choose an opening";

  const previewFullName = selected
    ? variationLabelOf(selected.name) === "Main line"
      ? baseNameOf(selected.name)
      : `${baseNameOf(selected.name)}: ${variationLabelOf(selected.name)}`
    : "";

  return (
    <main className="page">
      <div className="card">
        <section className="progress-overview" aria-label="Your progress">
          <div className="progress-group" aria-label="Training progress">
            <h2 className="progress-group-label">Training</h2>
            <div className="progress-group-row">
              <div className="progress-stat">
                <span className="progress-stat-value">
                  {summary?.positionsSeen ?? 0}
                </span>
                <span className="progress-stat-label">Positions trained</span>
              </div>
              <div className="progress-stat">
                <span className="progress-stat-value">
                  {summary
                    ? `${Math.round(summary.overallAccuracy * 100)}%`
                    : "—"}
                </span>
                <span className="progress-stat-label">Accuracy</span>
              </div>
              <div className="progress-stat">
                <span className="progress-stat-value">
                  {summary?.currentStreak ?? 0}
                  {(summary?.currentStreak ?? 0) > 0 ? " 🔥" : ""}
                </span>
                <span className="progress-stat-label">
                  Day streak{summary?.longestStreak ? ` · best ${summary.longestStreak}` : ""}
                </span>
              </div>
              <div className="progress-stat progress-stat--mastery">
                <span className="progress-stat-value">{summary?.mastered ?? 0}</span>
                <span className="progress-stat-label">Mastered</span>
                {summary && summary.positionsSeen > 0 && (
                  <div className="mastery-bar" aria-hidden="true">
                    <div
                      className="mastery-bar-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((summary.mastered / summary.positionsSeen) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="progress-stat">
                <button
                  type="button"
                  className="progress-review-btn"
                  disabled={dueCount === 0}
                  onClick={startReviewSession}
                >
                  Review due ({dueCount})
                </button>
              </div>
              {weakSpots.length > 0 && (
                <div className="progress-weak-spots">
                  <span className="progress-stat-label">Weak spots</span>
                  <ul>
                    {weakSpots.map((w) => (
                      <li key={`${w.openingName ?? "Opening"}-${w.fen ?? ""}-${w.correctMoveUci ?? ""}`}>
                        {w.openingName ?? "Opening"} — {w.correctCount}/{w.attempts}{" "}
                        correct
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="progress-group progress-group--puzzles" aria-label="Puzzle progress">
            <h2 className="progress-group-label">Puzzles</h2>
            <div className="progress-group-row">
              <div className="progress-stat">
                <span className="progress-stat-value">
                  {puzzleSummary?.puzzlesSeen ?? 0}
                </span>
                <span className="progress-stat-label">Puzzles solved</span>
              </div>
              <div className="progress-stat">
                <span className="progress-stat-value">
                  {puzzleSummary
                    ? `${Math.round(puzzleSummary.overallAccuracy * 100)}%`
                    : "—"}
                </span>
                <span className="progress-stat-label">Accuracy</span>
              </div>
              <div className="progress-stat">
                <span className="progress-stat-value">{puzzleSummary?.mastered ?? 0}</span>
                <span className="progress-stat-label">Mastered</span>
              </div>
              <div className="progress-stat">
                <button
                  type="button"
                  className="progress-review-btn"
                  onClick={() => navigate("/puzzles")}
                >
                  Practice puzzles
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="opening-browser">
          <header className="ob-toolbar">
            <div className="ob-heading">
              <h1 className="ob-title">Openings</h1>
              <p className="ob-sub">{subText}</p>
            </div>
            <span className="ob-grow" />
            <div className="ob-search">
              <span className="ob-search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                type="search"
                aria-label="Search openings"
                placeholder="Search openings or ECO…"
                value={query}
                autoComplete="off"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchLimit(SEARCH_PAGE);
                }}
              />
            </div>
            {view === "bases" && (
              <button
                type="button"
                className="ob-sort"
                onClick={() => setSortAZ((s) => !s)}
              >
                Sort: {sortAZ ? "A–Z" : "Popular"}
              </button>
            )}
          </header>

          <div className="ob-body">
            <div className="ob-content">
              {view === "search" && (
                <SearchResults
                  matches={searchMatches}
                  limit={searchLimit}
                  selectedKey={selected ? selected.eco + selected.name : null}
                  query={query}
                  onPick={pickFromSearch}
                  onMore={() => setSearchLimit((n) => n + SEARCH_PAGE)}
                />
              )}

              {view === "variations" && activeGroup && (
                <>
                  <nav className="ob-crumbs" aria-label="Breadcrumb">
                    <button type="button" onClick={goHome}>
                      All openings
                    </button>
                    <span className="sep">/</span>
                    <span className="here">{activeGroup.base}</span>
                  </nav>
                  <VariationList
                    rows={activeGroup.members}
                    selectedKey={selected ? selected.eco + selected.name : null}
                    onPick={setSelected}
                  />
                </>
              )}

              {view === "bases" && (
                <div className="opening-grid">
                  {sortedGroups.map((g) => (
                    <OpeningCard
                      key={g.base}
                      group={g}
                      selected={
                        selected != null && baseNameOf(selected.name) === g.base
                      }
                      onSelect={() => openBase(g)}
                    />
                  ))}
                </div>
              )}
            </div>

            <aside className={`ob-preview${selected ? "" : " is-empty"}`}>
              {selected ? (
                <div className="ob-preview-inner">
                  <BoardPreview
                    key={selected.name}
                    openings={[selected]}
                    selectedOpeningName={selected.name}
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
                    Pick an opening to preview the line and start training.
                  </p>
                </div>
              )}

              <div
                className="ob-color-toggle"
                role="radiogroup"
                aria-label="Play as"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={playerColor === "w"}
                  className={`ob-color-btn${playerColor === "w" ? " selected" : ""}`}
                  onClick={() => setPlayerColor("w")}
                >
                  Play as White
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={playerColor === "b"}
                  className={`ob-color-btn${playerColor === "b" ? " selected" : ""}`}
                  onClick={() => setPlayerColor("b")}
                >
                  Play as Black
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
            key={o.eco + o.name}
            type="button"
            role="listitem"
            className={`variation-row${selectedKey === o.eco + o.name ? " selected" : ""}`}
            onClick={() => onPick(o)}
            aria-pressed={selectedKey === o.eco + o.name}
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
