import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Chess, type Square } from "chess.js";
import Board, { type BoardMarker } from "../components/Board";
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

  const isWhiteToMove = useMemo(() => new Chess(fen).turn() === "w", [fen]);
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
    const game = new Chess(fenRef.current);
    if (game.turn() !== "b") {
      return;
    }

    const can = takeAutoplayOnce(itemId);
    lastAutoplayedItemIdRef.current = itemId;
    lastSubmittedMoveUciRef.current = correctMoveUci;
    if (!can) return;

    // Build next fen locally to keep timeline consistent
    const uci = correctMoveUci;
    const from = uci.substring(0, 2);
    const to = uci.substring(2, 4);

    // UCI promotion is like e7e8q. If no promo char exists, don't force "q".
    const promoChar = uci.length > 4 ? uci[4] : undefined;
    try {
      const move = game.move({
        from,
        to,
        ...(promoChar ? { promotion: promoChar } : {}),
      });

      if (move) {
        appendTimelineFen(game.fen());
      }
    } catch (err) {
      console.error(err);
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

      try {
        const uciPrefix = `${sourceSquare}${targetSquare}`;
        const expectedPromo = correctMoveUci.startsWith(uciPrefix)
          ? correctMoveUci.slice(uciPrefix.length)
          : "";

        // Don’t force promotion unless we actually have one
        const promoForMove = expectedPromo ? expectedPromo : undefined;

        const game = new Chess(fenRef.current);
        const move = game.move({
          from: sourceSquare,
          to: targetSquare,
          ...(promoForMove ? { promotion: promoForMove } : {}),
        });

        if (move === null) {
          setLocalFeedback("❌ Illegal move");
          return false;
        }

        const nextFen = game.fen();
        setFen(nextFen);
        appendTimelineFen(nextFen);

        const promotionChar = move.promotion
          ? String(move.promotion).toLowerCase()
          : "";
        const uci = `${sourceSquare}${targetSquare}${promotionChar}`;

        setLocalFeedback("");
        lastSubmittedMoveUciRef.current = uci;
        setMoveInput(uci);
        void submitMove(uci, fenRef.current);

        return true;
      } catch {
        setLocalFeedback("❌ Illegal move");
        return false;
      }
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
      const game = new Chess(fenRef.current);
      const piece = game.get(square as Square);
      return !!piece && piece.color === "w";
    },
    [atLatest, itemId, isWhiteToMove],
  );

  // Legal targets for the picked-up piece — rendered as dots by cm-chessboard.
  const getLegalMoves = useCallback(
    (square: string): { to: string; promotion?: string }[] => {
      const game = new Chess(fenRef.current);
      return game
        .moves({ square: square as Square, verbose: true })
        .map((m) => ({ to: m.to, promotion: m.promotion }));
    },
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
