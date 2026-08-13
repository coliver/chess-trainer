import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import Board, { type BoardMarker } from "../components/Board";
import { sideToMove } from "../core/fen";
import { applyMove, applyUci, legalMoves, pieceColorAt } from "../core/moves";
import FenTurnBadge from "../components/FenTurnBadge";
import { useBlinkGreen } from "../hooks/useBlinkGreen";
import { useTrainingSession } from "../hooks/useTrainingSession";

export const Training = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { blinkGreen, blinkSquare } = useBlinkGreen();
  const handle401 = useCallback(() => navigate("/login"), [navigate]);

  const {
    fen,
    setFen,
    itemId,
    correctMoveUci,
    openingLabel,
    feedback,
    isSubmitting,
    isAdvancing,
    submitMove,
    takeAutoplayOnce,
    isSessionCompleted,
  } = useTrainingSession(id, handle401);

  const [moveInput, setMoveInput] = useState("");
  const [showAnimations] = useState(true);
  const [hintLevel, setHintLevel] = useState(-1);
  const [localFeedback, setLocalFeedback] = useState("");
  const shownFeedback = localFeedback || feedback;

  const fenRef = useRef(fen);
  const lastSubmittedMoveUciRef = useRef<string>("");
  const isSubmittingRef = useRef(isSubmitting);
  const isAdvancingRef = useRef(isAdvancing);
  const lastAutoplayedItemIdRef = useRef<string | null>(null);
  const prevFeedbackRef = useRef<string>(feedback);

  // Timeline: keep both state (for UI render) and a ref (for sync checks in effects)
  const [timeline, setTimeline] = useState(() => ({
    fens: [fen],
    indices: 0,
  }));
  const timelineRef = useRef(timeline);

  useEffect(() => {
    setTimeline((t) => {
      const current = t.fens[t.indices];
      if (current === fen) return t;

      const next = { fens: [fen], indices: 0 };
      timelineRef.current = next;
      return next;
    });
  }, [fen]);

  useEffect(() => {
    timelineRef.current = timeline;
  }, [timeline]);

  useEffect(() => {
    fenRef.current = fen;
  }, [fen]);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    isAdvancingRef.current = isAdvancing;
  }, [isAdvancing]);

  useEffect(() => {
    if (
      prevFeedbackRef.current !== "✅ Correct!" &&
      feedback === "✅ Correct!"
    ) {
      setHintLevel(-1);
    }
    prevFeedbackRef.current = feedback;
  }, [feedback]);

  useEffect(() => {
    if (feedback === "✅ Correct!" && lastSubmittedMoveUciRef.current) {
      blinkGreen(lastSubmittedMoveUciRef.current, 2);
    }
  }, [feedback, blinkGreen]);

  const isWhiteToMove = useMemo(() => sideToMove(fen) === "w", [fen]);
  const atLatest = timeline.indices === timeline.fens.length - 1;

  const appendTimelineFen = useCallback((nextFen: string) => {
    setTimeline((t) => {
      const prefix = t.fens.slice(0, t.indices + 1);
      if (prefix[prefix.length - 1] === nextFen) {
        return t;
      }
      const next = { fens: [...prefix, nextFen], indices: prefix.length };
      timelineRef.current = next; // sync ref immediately
      return next;
    });
  }, []);

  const resetUiForJump = useCallback(() => {
    setLocalFeedback("");
    setMoveInput("");
    setHintLevel(-1);
  }, []);

  const jumpToIndex = useCallback(
    (nextIndex: number) => {
      const { fens, indices } = timelineRef.current;
      const clamped = Math.max(0, Math.min(nextIndex, fens.length - 1));
      if (clamped === indices) return;

      const nextFen = fens[clamped] ?? fens[0];

      const next = { fens, indices: clamped };
      timelineRef.current = next;
      setTimeline(next);

      setFen(nextFen);
      resetUiForJump();
    },
    [resetUiForJump, setFen],
  );

  useEffect(() => {
    if (
      !id ||
      !itemId ||
      isSubmitting ||
      isAdvancing ||
      !correctMoveUci ||
      isSessionCompleted
    ) {
      return;
    }

    if (lastAutoplayedItemIdRef.current === itemId) {
      return;
    }
    // Critical: autoplay MUST only run when we're at the latest timeline position
    const tl = timelineRef.current;
    if (tl.indices !== tl.fens.length - 1) {
      return;
    }
    if (sideToMove(fenRef.current) !== "b") {
      return;
    }

    const can = takeAutoplayOnce(itemId);
    lastAutoplayedItemIdRef.current = itemId;
    lastSubmittedMoveUciRef.current = correctMoveUci;
    if (!can) return;

    // Play the opponent's reply locally to keep the timeline consistent.
    const uci = correctMoveUci;
    const applied = applyUci(fenRef.current, uci);
    if (applied) {
      appendTimelineFen(applied.nextFen);
    }
    void submitMove(uci, fenRef.current);
  }, [
    id,
    itemId,
    fen,
    correctMoveUci,
    takeAutoplayOnce,
    submitMove,
    isSubmitting,
    isAdvancing,
    appendTimelineFen,
    isSessionCompleted,
  ]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const uci = moveInput.trim();
    if (!uci) return;

    setLocalFeedback("");
    lastSubmittedMoveUciRef.current = uci;
    await submitMove(uci, fenRef.current);
    setMoveInput("");
  };

  const processMove = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      if (isSubmittingRef.current || isAdvancingRef.current || !itemId)
        return false;

      if (!sourceSquare || !targetSquare) return false;

      // ✅ prevent chess.js from being called with from===to
      if (sourceSquare === targetSquare) return false;

      const result = applyMove(
        fenRef.current,
        sourceSquare,
        targetSquare,
        correctMoveUci,
      );
      if (!result) {
        setLocalFeedback("❌ Illegal move");
        return false;
      }

      setFen(result.nextFen);
      appendTimelineFen(result.nextFen);

      setLocalFeedback("");
      lastSubmittedMoveUciRef.current = result.uci;
      setMoveInput(result.uci);
      void submitMove(result.uci, fenRef.current);

      return true;
    },
    [
      appendTimelineFen,
      correctMoveUci,
      itemId,
      setFen,
      submitMove,
    ],
  );

  // Drag and click both funnel through cm-chessboard's move-input validation
  // into the same processMove (chess.js stays the source of truth).
  const onMove = useCallback(
    (from: string, to: string): boolean => {
      if (!from || !to || from === to) return false;
      return processMove(from, to);
    },
    [processMove],
  );

  // Whether the user may pick up the piece on `square` (mirrors the old
  // click/drag guards). Blocks past-timeline positions, in-flight submits,
  // non-white pieces, and off-turn moves.
  const canPickUp = useCallback(
    (square: string): boolean => {
      if (!atLatest) return false;
      if (isSubmittingRef.current || isAdvancingRef.current || !itemId)
        return false;
      if (!isWhiteToMove) return false;
      return pieceColorAt(fenRef.current, square) === "w";
    },
    [atLatest, itemId, isWhiteToMove],
  );

  // Legal targets for the picked-up piece — rendered as dots by cm-chessboard.
  const getLegalMoves = useCallback(
    (square: string): { to: string; promotion?: string }[] =>
      legalMoves(fenRef.current, square),
    [],
  );

  // Persistent highlights: hint (from, then from+to) and correct-move blink.
  const markers = useMemo((): BoardMarker[] => {
    const arr: BoardMarker[] = [];

    if (correctMoveUci && hintLevel >= 0) {
      const fromSquare = correctMoveUci.substring(0, 2);
      const toSquare = correctMoveUci.substring(2, 4);
      arr.push({ square: fromSquare, type: "hint" });
      if (hintLevel === 1) arr.push({ square: toSquare, type: "hint" });
    }

    if (blinkSquare) arr.push({ square: blinkSquare, type: "blink" });

    return arr;
  }, [correctMoveUci, hintLevel, blinkSquare]);

  return (
    <main className="page">
      <div className="card">
        {/* remount per itemId so timeline starts fresh for that training position */}
        <div key={itemId ?? "none"} className="dashboard-layout">
          <div className="dashboard-tile tile-start">
            <div className="tile-start-text">
              <div className="tile-title">Training</div>
              <div className="tile-subtitle">{openingLabel}</div>
            </div>

            <div className="tile-spacer" />

            <div className="training-start-body">
              <div className="training-board-wrap">
                <Board
                  position={fen}
                  interactive
                  animated={showAnimations}
                  moveColor="white"
                  markers={markers}
                  getLegalMoves={getLegalMoves}
                  onMoveStart={canPickUp}
                  onMove={onMove}
                />
              </div>

              <div className="training-form-wrap">
                <form className="training-form" onSubmit={handleSubmit}>
                  <input
                    className="text-input"
                    value={moveInput}
                    onChange={(e) => setMoveInput(e.target.value)}
                    placeholder="e.g. e2e4"
                    disabled={isSubmitting}
                  />

                  <div className="training-form-actions">
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => jumpToIndex(timeline.indices - 1)}
                      disabled={
                        isSubmitting || isAdvancing || timeline.indices <= 0
                      }
                    >
                      Prev
                    </button>

                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => jumpToIndex(timeline.indices + 1)}
                      disabled={
                        isSubmitting ||
                        isAdvancing ||
                        timeline.indices >= timeline.fens.length - 1
                      }
                    >
                      Next
                    </button>

                    <button
                      className="btn"
                      type="submit"
                      disabled={
                        isSubmitting ||
                        isAdvancing ||
                        !moveInput.trim() ||
                        !atLatest
                      }
                      title={
                        !atLatest
                          ? "Jump to latest before submitting"
                          : undefined
                      }
                    >
                      Submit
                    </button>

                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => {
                        if (
                          isSubmittingRef.current ||
                          isAdvancingRef.current ||
                          !itemId
                        )
                          return;
                        setHintLevel((h) => (h < 0 ? 0 : 1));
                      }}
                      disabled={isSubmitting || isAdvancing || !itemId}
                    >
                      Hint
                    </button>
                  </div>

                  <FenTurnBadge fen={fen} />
                </form>

                <p className="training-feedback">{shownFeedback}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
