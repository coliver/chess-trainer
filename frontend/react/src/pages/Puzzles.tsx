// react/src/pages/Puzzles.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AxiosError } from "axios";
import api from "../api";
import Board, { type BoardArrow, type BoardMarker } from "../components/Board";
import { Button } from "../components/Button";
import { FlipBoardButton } from "../components/FlipBoardButton";
import { useBoardOrientation } from "../hooks/useBoardOrientation";
import { usePreferences } from "../context/PreferencesContext";
import {
  START_FEN,
  applyMove,
  classifyFeedback,
  deriveHintMarkers,
  legalMoves,
  pieceColorAt,
  sideToMove,
} from "@knight-school/chess-core";
import { getMoveSound, playSound } from "../utils/sound";
import { celebratePuzzleCorrect } from "../utils/winCelebration";
import { formatThemeLabel } from "../utils/puzzleThemes";

type NextPuzzle = {
  puzzleId: string;
  fen: string;
  rating: number;
  themes?: string | null;
  correctMoveUci: string;
  lastMoveUci: string;
  moveIndex: number;
  solverMovesTotal: number;
};

export const Puzzles = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = searchParams.get("theme");

  type HistoryEntry = {
    puzzle: NextPuzzle;
    solved: boolean;
    usedHint: boolean;
    finalFen: string;
    finalLastMoveUci: string;
  };

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  const historyIndexRef = useRef(historyIndex);
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const atFrontier = historyIndex === history.length - 1;
  const viewingPast = !atFrontier && historyIndex >= 0;
  const currentEntry = viewingPast ? history[historyIndex] : null;

  const puzzleId = atFrontier ? (history[historyIndex]?.puzzle.puzzleId ?? null) : null;
  const puzzleIdRef = useRef(puzzleId);
  useEffect(() => {
    puzzleIdRef.current = puzzleId;
  }, [puzzleId]);
  const [fen, setFen] = useState(START_FEN);
  const [correctMoveUci, setCorrectMoveUci] = useState("");
  const [lastMoveUci, setLastMoveUci] = useState("");
  const [moveIndex, setMoveIndex] = useState(0);
  const [solverMovesTotal, setSolverMovesTotal] = useState(1);
  const [rating, setRating] = useState<number | null>(null);
  const [themes, setThemes] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [solved, setSolved] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [noPuzzlesDue, setNoPuzzlesDue] = useState(false);
  const [puzzleComplete, setPuzzleComplete] = useState(false);
  const [hintLevel, setHintLevel] = useState(-1);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const effectiveHintLevel = Math.max(
    hintLevel,
    wrongAttempts >= 4 ? 1 : wrongAttempts >= 2 ? 0 : -1,
  );
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  // Move focus to the "Next puzzle" button when it appears, so keyboard
  // users can advance without hunting for it. useEffect (not autoFocus,
  // which fires unconditionally on mount) keeps this scoped to the moment
  // the button is actually revealed.
  useEffect(() => {
    if (puzzleComplete) nextButtonRef.current?.focus();
  }, [puzzleComplete]);
  const { preferences } = usePreferences();
  const { orientation, flip, setOrientation } = useBoardOrientation();

  const fenRef = useRef(fen);
  useEffect(() => {
    fenRef.current = fen;
  }, [fen]);

  // Mirrored synchronously at every write site (not via a useEffect) so
  // submit() always reads the up-to-date value: an effect-based mirror
  // would lag behind DOM updates that tests (and users) can act on
  // immediately, causing the next submit() to send a stale moveIndex.
  const moveIndexRef = useRef(moveIndex);
  const updateMoveIndex = (next: number | ((prev: number) => number)) => {
    setMoveIndex((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      moveIndexRef.current = resolved;
      return resolved;
    });
  };

  // Sticky per-puzzle: true once the hint button has been clicked anywhere
  // in this puzzle's move sequence, sent on every attempt so the backend can
  // persist it even though intermediate correct moves never touch the DB.
  const usedHintRef = useRef(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadNext = useCallback(async () => {
    setFeedback("");
    setNoPuzzlesDue(false);
    setPuzzleComplete(false);
    setHintLevel(-1);
    usedHintRef.current = false;
    setWrongAttempts(0);
    try {
      const res = await api.get<NextPuzzle>("/puzzles/next", {
        params: {
          ...(theme ? { theme } : undefined),
          ...(puzzleIdRef.current ? { excludeId: puzzleIdRef.current } : undefined),
        },
      });
      if (!isMountedRef.current) return;
      setFen(res.data.fen);
      setCorrectMoveUci(res.data.correctMoveUci);
      setLastMoveUci(res.data.lastMoveUci);
      updateMoveIndex(res.data.moveIndex);
      setSolverMovesTotal(res.data.solverMovesTotal);
      setRating(res.data.rating);
      setThemes(res.data.themes ?? null);
      setHistory((prev) => [
        ...prev,
        {
          puzzle: res.data,
          solved: false,
          usedHint: false,
          finalFen: res.data.fen,
          finalLastMoveUci: res.data.lastMoveUci,
        },
      ]);
      setHistoryIndex((prev) => prev + 1);
      if (preferences.board_orientation_mode === "auto") {
        setOrientation(sideToMove(res.data.fen) === "b" ? "black" : "white");
      } else {
        setOrientation(preferences.board_orientation_mode);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      const e = err as AxiosError;
      if (e.response?.status === 401) {
        navigate("/login");
        return;
      }
      if (e.response?.status === 404) {
        setLastMoveUci("");
        setNoPuzzlesDue(true);
        setFeedback(
          theme ? t("puzzles.noPuzzlesForTheme") : t("puzzles.noPuzzlesDue"),
        );
        return;
      }
      setLastMoveUci("");
      setFeedback(t("puzzles.loadFailed"));
    }
  }, [navigate, preferences.board_orientation_mode, setOrientation, t, theme]);

  useEffect(() => {
    const run = async () => {
      await loadNext();
    };
    void run();
  }, [loadNext]);

  const submit = useCallback(
    async (moveUci: string, preFen: string) => {
      if (!puzzleId || isSubmitting) return;
      setIsSubmitting(true);
      try {
        const res = await api.post<{
          correct: boolean;
          reason: string;
          fenAfter?: string | null;
          puzzleComplete?: boolean | null;
          opponentReplyUci?: string | null;
          nextCorrectMoveUci?: string | null;
        }>(`/puzzles/${puzzleId}/attempts`, {
          moveUci,
          moveIndex: moveIndexRef.current,
          usedHint: usedHintRef.current,
        });
        if (!isMountedRef.current) return;

        if (res.data.correct && res.data.puzzleComplete) {
          playSound("puzzleCorrect");
          celebratePuzzleCorrect();
          setFeedback(t("puzzles.correct"));
          setSolved((n) => n + 1);
          setStreak((n) => {
            const next = n + 1;
            setBestStreak((best) => Math.max(best, next));
            return next;
          });
          setPuzzleComplete(true);
          setHistory((prev) => {
            const next = [...prev];
            const idx = next.length - 1;
            next[idx] = {
              ...next[idx],
              solved: true,
              usedHint: usedHintRef.current,
              finalFen: fenRef.current,
              finalLastMoveUci: moveUci,
            };
            return next;
          });
        } else if (res.data.correct) {
          // Correct, but more solver moves remain: apply the auto-played
          // opponent reply and keep the puzzle interactive.
          playSound("puzzleCorrect");
          setFeedback(t("puzzles.keepGoing"));
          if (res.data.fenAfter) setFen(res.data.fenAfter);
          if (res.data.opponentReplyUci) setLastMoveUci(res.data.opponentReplyUci);
          if (res.data.nextCorrectMoveUci) setCorrectMoveUci(res.data.nextCorrectMoveUci);
          setHintLevel(-1);
          setWrongAttempts(0);
          updateMoveIndex((n) => n + 1);
        } else {
          playSound("puzzleWrong");
          setFeedback(
            `❌ ${res.data.reason || t("puzzles.incorrectFallback")}`,
          );
          setFen(preFen); // snap back to the puzzle position
          setStreak(0);
          setWrongAttempts((n) => n + 1);
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        const e = err as AxiosError;
        if (e.response?.status === 401) navigate("/login");
        setFeedback(t("puzzles.submitError"));
      } finally {
        if (isMountedRef.current) setIsSubmitting(false);
      }
    },
    [puzzleId, isSubmitting, navigate, t],
  );

  const skip = useCallback(() => {
    if (!puzzleId || isSubmitting) return;
    setStreak(0);
    void loadNext();
  }, [puzzleId, isSubmitting, loadNext]);

  const goToPrev = useCallback(() => {
    setHistoryIndex((idx) => Math.max(0, idx - 1));
  }, []);

  const goToNext = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      setHistoryIndex((idx) => idx + 1);
    } else {
      void loadNext();
    }
  }, [loadNext]);

  const solverColor = sideToMove(fen);

  const { kind: feedbackKind, icon: feedbackIcon } = classifyFeedback(feedback);
  const statusKind = feedbackKind === "neutral" ? "your" : feedbackKind;
  // Puzzles keeps its own neutral icon (pawn) rather than deriveStatus's king.
  const statusIcon = feedbackKind === "neutral" ? "♟" : feedbackIcon;
  const statusMsg =
    feedback ||
    (puzzleId
      ? t(
          solverColor === "b"
            ? "puzzles.findBestMoveBlack"
            : "puzzles.findBestMoveWhite",
        )
      : "");

  const onMove = useCallback(
    (from: string, to: string): boolean => {
      if (isSubmitting || !puzzleId || from === to) return false;
      const preFen = fenRef.current;
      const result = applyMove(preFen, from, to, correctMoveUci);
      if (!result) {
        playSound("illegal");
        return false;
      }

      setFen(result.nextFen);

      const moveSound = getMoveSound(preFen, result.uci);
      playSound(moveSound);

      void submit(result.uci, preFen);
      return true;
    },
    [isSubmitting, puzzleId, correctMoveUci, submit],
  );
  
  const canPickUp = useCallback(
    (square: string): boolean => {
      if (isSubmitting || !puzzleId) return false;
      return pieceColorAt(fenRef.current, square) === solverColor;
    },
    [isSubmitting, puzzleId, solverColor],
  );

  const getLegalMoves = useCallback(
    (square: string) => legalMoves(fenRef.current, square),
    [],
  );

  const themeList = useMemo(
    () =>
      (themes ?? "")
        .split(" ")
        .filter(Boolean)
        .map(formatThemeLabel),
    [themes],
  );

  // Highlight the enemy's setup move (from/to) that produced this puzzle position.
  const markers = useMemo((): BoardMarker[] => {
    const arr: BoardMarker[] = [];
    const lastMove = viewingPast ? currentEntry?.finalLastMoveUci : lastMoveUci;
    if (lastMove && lastMove.length >= 4) {
      arr.push({ square: lastMove.slice(0, 2), type: "lastmove" });
      arr.push({ square: lastMove.slice(2, 4), type: "lastmove" });
    }
    if (viewingPast) return arr;
    const hint = deriveHintMarkers(correctMoveUci, effectiveHintLevel, puzzleComplete);
    if (hint) {
      arr.push({ square: hint.from, type: "hint" });
      if (hint.to) arr.push({ square: hint.to, type: "hint" });
    }
    return arr;
  }, [viewingPast, currentEntry, lastMoveUci, correctMoveUci, effectiveHintLevel, puzzleComplete]);

  const hintArrows = useMemo((): BoardArrow[] => {
    if (effectiveHintLevel < 1 || puzzleComplete || !correctMoveUci) return [];
    return [
      { from: correctMoveUci.slice(0, 2), to: correctMoveUci.slice(2, 4), type: "info" },
    ];
  }, [effectiveHintLevel, puzzleComplete, correctMoveUci]);

  // The idle "find the best move" prompt shows a plain pawn glyph, colored
  // to match the side actually solving the puzzle (Puzzles overrides
  // deriveStatus's white king icon with a pawn for exactly this state).
  const isBlackToFindMove = feedbackKind === "neutral" && solverColor === "b";

  const statusBanner = statusMsg && (
    <div className={`train-status ${statusKind}`} role="status">
      <span
        className={`train-status-ic${isBlackToFindMove ? " is-black-piece" : ""}`}
        aria-hidden="true"
      >
        {statusIcon}
      </span>
      <div>
        <div className="train-status-msg">{statusMsg}</div>
      </div>
    </div>
  );

  return (
    <main className="page">
      <div className="card">
        <div className="train puzzles-train">
          <div className="train-board-col">
            <div className="training-board-wrap">
              <Board
                position={viewingPast ? currentEntry!.finalFen : fen}
                orientation={orientation}
                interactive={!viewingPast && !!puzzleId && !isSubmitting && !puzzleComplete}
                moveColor={solverColor === "b" ? "black" : "white"}
                markers={markers}
                arrows={hintArrows}
                onMoveStart={canPickUp}
                getLegalMoves={getLegalMoves}
                onMove={onMove}
              />
            </div>
            <div className="board-under">
              <span className={`turn${solverColor === "b" ? " black" : ""}`}>
                <span className="turn-dot" aria-hidden="true" />
                {solverColor === "b"
                  ? t("training.blackToMove")
                  : t("training.whiteToMove")}
              </span>
              <div className="board-toolbar">
                <FlipBoardButton className="icon-btn" onClick={flip} />
                {historyIndex > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="icon-btn"
                    onClick={goToPrev}
                    aria-label={t("puzzles.previousPuzzle")}
                    title={t("puzzles.previousPuzzle")}
                  >
                    <span aria-hidden="true">⏮</span>
                  </Button>
                )}
                {!viewingPast && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="icon-btn hint-icon"
                    onClick={() => {
                      if (!puzzleId || isSubmitting || puzzleComplete) return;
                      usedHintRef.current = true;
                      setHintLevel((h) => (h < 0 ? 0 : 1));
                    }}
                    disabled={!puzzleId || isSubmitting || puzzleComplete}
                    aria-label={t("puzzles.showHint")}
                    title={t("puzzles.showHint")}
                  >
                    <span aria-hidden="true">💡</span>
                  </Button>
                )}
                {puzzleId && !puzzleComplete && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="icon-btn"
                    onClick={skip}
                    disabled={isSubmitting}
                    aria-label={t("puzzles.skipPuzzle")}
                    title={t("puzzles.skipPuzzle")}
                  >
                    <span aria-hidden="true">⏭</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="puzzle-status-slot">{statusBanner}</div>

          <aside className="train-rail puzzles-rail">
            <div className="rail-head">
              <div className="rail-eyebrow">{t("puzzles.eyebrow")}</div>
              <div className="rail-title">
                <h1>{t("puzzles.title")}</h1>
                {rating != null && (
                  <span className="eco-chip">
                    {t("puzzles.rating", { rating })}
                  </span>
                )}
                {solverMovesTotal > 1 && (
                  <span className="eco-chip">
                    {t("puzzles.moveProgress", {
                      current: moveIndex + 1,
                      total: solverMovesTotal,
                    })}
                  </span>
                )}
              </div>
            </div>

            <div className="puzzles-meta">
              <div className="puzzles-stats">
                <span className="stat-pill">
                  {t("puzzles.solved", { count: solved })}
                </span>
                <span
                  className={streak > 0 ? "stat-pill is-active" : "stat-pill"}
                >
                  {t("puzzles.streak", { count: streak })}
                  {streak > 0 ? " 🔥" : ""}
                  {bestStreak > 0
                    ? t("puzzles.streakBest", { best: bestStreak })
                    : ""}
                </span>
              </div>

              {theme && (
                <span className="stat-pill is-active">
                  {t("puzzles.practicing", { theme: formatThemeLabel(theme) })}
                </span>
              )}

              {themeList.length > 0 && (
                <div className="puzzles-themes">
                  {themeList.map((themeLabel) => (
                    <span key={themeLabel} className="puzzles-theme-chip">
                      {themeLabel}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {((puzzleId && puzzleComplete) || viewingPast) && (
              <button
                ref={nextButtonRef}
                type="button"
                className="puzzles-next"
                onClick={goToNext}
              >
                {t("puzzles.nextPuzzle")}
              </button>
            )}

            {theme ? (
              <Link to="/puzzles" className="puzzles-back-link">
                {t("puzzles.backToDuePuzzles")}
              </Link>
            ) : (
              <Link to="/puzzles/themes" className="puzzles-back-link">
                {t("puzzles.browseThemes")}
              </Link>
            )}

            {noPuzzlesDue && !theme && (
              <Link to="/dashboard" className="puzzles-back-link">
                {t("puzzles.backToDashboard")}
              </Link>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
};

export default Puzzles;
