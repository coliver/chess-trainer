// react/src/pages/Puzzles.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import api from "../api";
import Board from "../components/Board";
import { FlipBoardButton } from "../components/FlipBoardButton";
import { useBoardOrientation } from "../hooks/useBoardOrientation";
import {
  START_FEN,
  applyMove,
  legalMoves,
  pieceColorAt,
  sideToMove,
} from "@knight-school/chess-core";

type NextPuzzle = {
  puzzleId: string;
  fen: string;
  rating: number;
  themes?: string | null;
  correctMoveUci: string;
};

export const Puzzles = () => {
  const navigate = useNavigate();

  const [puzzleId, setPuzzleId] = useState<string | null>(null);
  const [fen, setFen] = useState(START_FEN);
  const [correctMoveUci, setCorrectMoveUci] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [solved, setSolved] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [noPuzzlesDue, setNoPuzzlesDue] = useState(false);
  const { orientation, flip } = useBoardOrientation();

  const fenRef = useRef(fen);
  useEffect(() => {
    fenRef.current = fen;
  }, [fen]);

  const loadNext = useCallback(async () => {
    setFeedback("");
    setNoPuzzlesDue(false);
    try {
      const res = await api.get<NextPuzzle>("/puzzles/next");
      setPuzzleId(res.data.puzzleId);
      setFen(res.data.fen);
      setCorrectMoveUci(res.data.correctMoveUci);
      setRating(res.data.rating);
    } catch (err) {
      const e = err as AxiosError;
      if (e.response?.status === 401) {
        navigate("/login");
        return;
      }
      if (e.response?.status === 404) {
        setPuzzleId(null);
        setNoPuzzlesDue(true);
        setFeedback("No puzzles due right now — check back later.");
        return;
      }
      setFeedback("Failed to load a puzzle. Check your connection.");
    }
  }, [navigate]);

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
        }>(`/puzzles/${puzzleId}/attempts`, { moveUci });

        if (res.data.correct) {
          setFeedback("✅ Correct!");
          setSolved((n) => n + 1);
          setStreak((n) => {
            const next = n + 1;
            setBestStreak((best) => Math.max(best, next));
            return next;
          });
          setTimeout(() => void loadNext(), 600);
        } else {
          setFeedback(`❌ ${res.data.reason || "Not quite — try again."}`);
          setFen(preFen); // snap back to the puzzle position
          setStreak(0);
        }
      } catch (err) {
        const e = err as AxiosError;
        if (e.response?.status === 401) navigate("/login");
        setFeedback("Error submitting move.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [puzzleId, isSubmitting, loadNext, navigate],
  );

  const skip = useCallback(() => {
    if (!puzzleId || isSubmitting) return;
    setStreak(0);
    void loadNext();
  }, [puzzleId, isSubmitting, loadNext]);

  const solverColor = sideToMove(fen);

  const onMove = useCallback(
    (from: string, to: string): boolean => {
      if (isSubmitting || !puzzleId || from === to) return false;
      const preFen = fenRef.current;
      const result = applyMove(preFen, from, to, correctMoveUci);
      if (!result) return false;
      setFen(result.nextFen);
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

  return (
    <main className="page">
      <div className="card puzzles-card">
        <header className="puzzles-header">
          <h1>Puzzles</h1>
          <div className="puzzles-meta">
            {rating != null && <span>Rating ~{rating}</span>}
            <span>Solved: {solved}</span>
            <span className={streak > 0 ? "puzzles-streak is-active" : "puzzles-streak"}>
              Streak: {streak}
              {streak > 0 ? " 🔥" : ""}
              {bestStreak > 0 ? ` · best ${bestStreak}` : ""}
            </span>
          </div>
        </header>

        <div className="puzzles-board-wrap">
          <Board
            position={fen}
            orientation={orientation}
            interactive={!!puzzleId && !isSubmitting}
            moveColor={solverColor === "b" ? "black" : "white"}
            onMoveStart={canPickUp}
            getLegalMoves={getLegalMoves}
            onMove={onMove}
          />
        </div>
        <div className="board-under">
          <span className={`turn${solverColor === "b" ? " black" : ""}`}>
            <span className="turn-dot" aria-hidden="true" />
            {solverColor === "b" ? "Black to move" : "White to move"}
          </span>
          <FlipBoardButton onClick={flip} />
        </div>

        <p className="puzzles-feedback" role="status">
          {feedback || (puzzleId ? "Find the best move." : "")}
        </p>

        {noPuzzlesDue && (
          <Link to="/dashboard" className="puzzles-back-link">
            Back to dashboard
          </Link>
        )}

        {puzzleId && (
          <button
            type="button"
            className="puzzles-skip"
            onClick={skip}
            disabled={isSubmitting}
          >
            Skip puzzle ›
          </button>
        )}
      </div>
    </main>
  );
};

export default Puzzles;
