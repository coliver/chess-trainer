// \frontend\src\pages\Dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

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
};

type WeakSpot = {
  fen: string;
  correctMoveUci: string;
  openingEco?: string | null;
  openingName?: string | null;
  attempts: number;
  correctCount: number;
  incorrectCount: number;
};

export const Dashboard = () => {
  const navigate = useNavigate();

  const [openings, setOpenings] = useState<Opening[]>([]);
  const [query, setQuery] = useState("");
  const [activeBase, setActiveBase] = useState<string | null>(null);
  const [selected, setSelected] = useState<Opening | null>(null);
  const [sortAZ, setSortAZ] = useState(false);
  const [searchLimit, setSearchLimit] = useState(SEARCH_PAGE);

  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [weakSpots, setWeakSpots] = useState<WeakSpot[]>([]);

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

  useEffect(() => {
    api
      .get("/progress/summary")
      .then((res) => setSummary(res.data ?? null))
      .catch((e) => console.error("Error loading progress summary:", e));
    api
      .get("/progress/due")
      .then((res) => setDueCount((res.data ?? []).length))
      .catch((e) => console.error("Error loading due positions:", e));
    api
      .get("/progress/weak-spots")
      .then((res) => setWeakSpots((res.data ?? []).slice(0, 5)))
      .catch((e) => console.error("Error loading weak spots:", e));
  }, []);

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

  const startSession = async (openingEco: string, openingName: string) => {
    try {
      const response = await api.post("/training-sessions", {
        openingEco,
        openingName,
      });
      navigate(`/training/${response.data.id}`);
    } catch (error) {
      console.error("Error starting session:", error);
      alert("Failed to start session. Check your connection or token.");
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
        <section className="progress-strip" aria-label="Training progress">
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
            <span className="progress-stat-value">{summary?.mastered ?? 0}</span>
            <span className="progress-stat-label">Mastered</span>
          </div>
          <div className="progress-stat">
            <span className="progress-stat-value">{dueCount}</span>
            <span className="progress-stat-label">Due for review</span>
          </div>
          {weakSpots.length > 0 && (
            <div className="progress-weak-spots">
              <span className="progress-stat-label">Weak spots</span>
              <ul>
                {weakSpots.map((w) => (
                  <li key={w.fen + w.correctMoveUci}>
                    {w.openingName ?? "Opening"} — {w.correctCount}/{w.attempts}{" "}
                    correct
                  </li>
                ))}
              </ul>
            </div>
          )}
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
                  selectedName={selected?.name ?? null}
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
                    selectedName={selected?.name ?? null}
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

              <Button
                className="tile-action ob-start"
                type="button"
                disabled={!selected}
                onClick={() =>
                  selected && startSession(selected.eco, selected.name)
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
  selectedName,
  query,
  onPick,
  onMore,
}: {
  matches: Opening[];
  limit: number;
  selectedName: string | null;
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
            className={`variation-row${selectedName === o.name ? " selected" : ""}`}
            onClick={() => onPick(o)}
            aria-pressed={selectedName === o.name}
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
