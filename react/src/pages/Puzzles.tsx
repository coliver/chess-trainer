// react/src/pages/Puzzles.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import api from "../api";
import Board, { type BoardMarker } from "../components/Board";
import { FlipBoardButton } from "../components/FlipBoardButton";
import { useBoardOrientation } from "../hooks/useBoardOrientation";
import { usePreferences } from "../context/PreferencesContext";
import {
  START_FEN,
  applyMove,
  classifyFeedback,
  legalMoves,
  pieceColorAt,
  sideToMove,
} from "@knight-school/chess-core";
import { getMoveSound, playSound } from "../utils/sound";
import { celebratePuzzleCorrect } from "../utils/winCelebration";

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

  const [puzzleId, setPuzzleId] = useState<string | null>(null);
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
  const { preferences } = usePreferences();
  const { orientation, flip, setOrientation } = useBoardOrientation();

  const fenRef = useRef(fen);
  useEffect(() => {
    fenRef.current = fen;
  }, [fen]);

  const moveIndexRef = useRef(moveIndex);
  useEffect(() => {
    moveIndexRef.current = moveIndex;
  }, [moveIndex]);

  // Tracks the "advance to next puzzle" timeout scheduled after a correct
  // answer, so it can be cancelled on unmount — otherwise it fires after the
  // user navigates away and calls loadNext() against a dead component.
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    };
  }, []);

  const loadNext = useCallback(async () => {
    setFeedback("");
    setNoPuzzlesDue(false);
    try {
      const res = await api.get<NextPuzzle>("/puzzles/next");
      if (!isMountedRef.current) return;
      setPuzzleId(res.data.puzzleId);
      setFen(res.data.fen);
      setCorrectMoveUci(res.data.correctMoveUci);
      setLastMoveUci(res.data.lastMoveUci);
      setMoveIndex(res.data.moveIndex);
      setSolverMovesTotal(res.data.solverMovesTotal);
      setRating(res.data.rating);
      setThemes(res.data.themes ?? null);
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
        setPuzzleId(null);
        setLastMoveUci("");
        setNoPuzzlesDue(true);
        setFeedback(t("puzzles.noPuzzlesDue"));
        return;
      }
      setLastMoveUci("");
      setFeedback(t("puzzles.loadFailed"));
    }
  }, [navigate, preferences.board_orientation_mode, setOrientation, t]);

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
          advanceTimeoutRef.current = setTimeout(() => void loadNext(), 1000);
        } else if (res.data.correct) {
          // Correct, but more solver moves remain: apply the auto-played
          // opponent reply and keep the puzzle interactive.
          playSound("puzzleCorrect");
          setFeedback(t("puzzles.keepGoing"));
          if (res.data.fenAfter) setFen(res.data.fenAfter);
          if (res.data.opponentReplyUci) setLastMoveUci(res.data.opponentReplyUci);
          if (res.data.nextCorrectMoveUci) setCorrectMoveUci(res.data.nextCorrectMoveUci);
          setMoveIndex((n) => n + 1);
        } else {
          playSound("puzzleWrong");
          setFeedback(
            `❌ ${res.data.reason || t("puzzles.incorrectFallback")}`,
          );
          setFen(preFen); // snap back to the puzzle position
          setStreak(0);
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
    [puzzleId, isSubmitting, loadNext, navigate, t],
  );

  const skip = useCallback(() => {
    if (!puzzleId || isSubmitting) return;
    setStreak(0);
    void loadNext();
  }, [puzzleId, isSubmitting, loadNext]);

  const solverColor = sideToMove(fen);

  const { kind: feedbackKind, icon: feedbackIcon } = classifyFeedback(feedback);
  const statusKind = feedbackKind === "neutral" ? "your" : feedbackKind;
  // Puzzles keeps its own neutral icon (pawn) rather than deriveStatus's king.
  const statusIcon = feedbackKind === "neutral" ? "♟" : feedbackIcon;
  const statusMsg = feedback || (puzzleId ? t("puzzles.findBestMove") : "");

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
        .map((theme) => theme.replace(/([a-z0-9])([A-Z])/g, "$1 $2")),
    [themes],
  );

  // Highlight the enemy's setup move (from/to) that produced this puzzle position.
  const markers = useMemo((): BoardMarker[] => {
    if (!lastMoveUci || lastMoveUci.length < 4) return [];
    return [
      { square: lastMoveUci.slice(0, 2), type: "lastmove" },
      { square: lastMoveUci.slice(2, 4), type: "lastmove" },
    ];
  }, [lastMoveUci]);

  return (
    <main className="page">
      <div className="card">
        <div className="train">
          <div className="train-board-col">
            <div className="training-board-wrap">
              <Board
                position={fen}
                orientation={orientation}
                interactive={!!puzzleId && !isSubmitting}
                moveColor={solverColor === "b" ? "black" : "white"}
                markers={markers}
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
              </div>
            </div>
          </div>

          <aside className="train-rail">
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

            {themeList.length > 0 && (
              <div className="puzzles-themes">
                {themeList.map((theme) => (
                  <span key={theme} className="puzzles-theme-chip">
                    {theme}
                  </span>
                ))}
              </div>
            )}

            {statusMsg && (
              <div className={`train-status ${statusKind}`} role="status">
                <span className="train-status-ic" aria-hidden="true">
                  {statusIcon}
                </span>
                <div>
                  <div className="train-status-msg">{statusMsg}</div>
                </div>
              </div>
            )}

            {puzzleId && (
              <button
                type="button"
                className="puzzles-skip"
                onClick={skip}
                disabled={isSubmitting}
              >
                {t("puzzles.skipPuzzle")}
              </button>
            )}

            {noPuzzlesDue && (
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
