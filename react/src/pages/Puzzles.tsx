// react/src/pages/Puzzles.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import api from "../api";
import Board from "../components/Board";
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

  const fenRef = useRef(fen);
  useEffect(() => {
    fenRef.current = fen;
  }, [fen]);

  const loadNext = useCallback(async () => {
    setFeedback("");
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
    async (moveUci: string) => {
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
          setTimeout(() => void loadNext(), 600);
        } else {
          setFeedback(`❌ ${res.data.reason || "Not quite — try again."}`);
          setFen(fenRef.current); // snap back to the puzzle position
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

  const solverColor = sideToMove(fen);

  const onMove = useCallback(
    (from: string, to: string): boolean => {
      if (isSubmitting || !puzzleId || from === to) return false;
      const result = applyMove(fenRef.current, from, to, correctMoveUci);
      if (!result) return false;
      setFen(result.nextFen);
      void submit(result.uci);
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
            <span>Solved this session: {solved}</span>
          </div>
        </header>

        <div className="puzzles-board-wrap">
          <Board
            position={fen}
            interactive={!!puzzleId && !isSubmitting}
            moveColor={solverColor}
            onMoveStart={canPickUp}
            getLegalMoves={getLegalMoves}
            onMove={onMove}
          />
        </div>

        <p className="puzzles-feedback" role="status">
          {feedback || (puzzleId ? "Find the best move." : "")}
        </p>
      </div>
    </main>
  );
};

export default Puzzles;
