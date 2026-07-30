import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Chess, type Square } from "chess.js";
import {
  Chessboard,
  type ChessboardOptions,
  type PieceDropHandlerArgs,
  type SquareHandlerArgs,
} from "react-chessboard";
import FenTurnBadge from "../components/FenTurnBadge";
import { useBlinkGreen } from "../hooks/useBlinkGreen";
import { useTrainingSession } from "../hooks/useTrainingSession";

export const Training = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { blinkGreen, squareStyles } = useBlinkGreen();
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
  const [moveFrom, setMoveFrom] = useState<string | null>(null);

  const moveFromRef = useRef<string | null>(null);
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
    moveFromRef.current = null;
  }, [itemId]);

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
    setMoveFrom(null);
    moveFromRef.current = null;
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
      console.log("autoplay: early return (missing)", {
        id,
        itemId,
        isSubmitting,
        isAdvancing,
        hasCorrectMove: !!correctMoveUci,
        isSessionCompleted,
      });
      return;
    }

    console.log("autoplay: start", {
      itemId,
      correctMoveUci,
      fen: fenRef.current,
      fenTurn: new Chess(fenRef.current).turn(),
    });

    if (lastAutoplayedItemIdRef.current === itemId) {
      console.log("autoplay: blocked by lastAutoplayedItemIdRef", {
        lastAutoplayedItemId: lastAutoplayedItemIdRef.current,
        itemId,
      });
      return;
    }
    // Critical: autoplay MUST only run when we're at the latest timeline position
    const tl = timelineRef.current;
    console.log("autoplay: timeline gate", {
      indices: tl.indices,
      len: tl.fens.length,
      latest: tl.fens.length - 1,
    });
    if (tl.indices !== tl.fens.length - 1) {
      console.log("autoplay: blocked by timeline not latest");
      return;
    }
    const game = new Chess(fenRef.current);
    if (game.turn() !== "b") {
      console.log("autoplay: blocked by turn not black", { turn: game.turn() });
      return;
    }

    const can = takeAutoplayOnce(itemId);
    console.log("autoplay: takeAutoplayOnce", { can });
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
      console.log(err);
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

        setMoveFrom(null);
        moveFromRef.current = null;

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

  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!targetSquare) return false;
      if (sourceSquare === targetSquare) return false;
      return processMove(sourceSquare, targetSquare);
    },
    [processMove],
  );

  const legalTargets = useMemo((): Set<string> => {
    if (!moveFrom) return new Set<string>();
    const game = new Chess(fen);
    const result = game.moves({ square: moveFrom, verbose: true });
    const targets = result
      .map((m) => m.to)
      .filter((to): to is string => typeof to === "string");
    return new Set(targets);
  }, [fen, moveFrom]);

  const combinedSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = { ...squareStyles };

    if (moveFrom) {
      styles[moveFrom] = { backgroundColor: "rgba(255, 255, 0, 0.35)" };
    }

    for (const to of legalTargets) {
      styles[to] = {
        background:
          "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    }

    if (correctMoveUci && hintLevel >= 0) {
      const fromSquare = correctMoveUci.substring(0, 2);
      const toSquare = correctMoveUci.substring(2, 4);
      const highlightStyle = { backgroundColor: "rgba(255, 255, 0, 0.35)" };

      if (hintLevel === 0) styles[fromSquare] = highlightStyle;
      if (hintLevel === 1) {
        styles[fromSquare] = highlightStyle;
        styles[toSquare] = highlightStyle;
      }
    }

    return styles;
  }, [squareStyles, moveFrom, correctMoveUci, hintLevel, legalTargets]);

  const onSquareClick = useCallback(
    ({ square }: SquareHandlerArgs): void => {
      const selectedSquare = square as Square;
      if (!selectedSquare) return;

      // If user is not at latest timeline, prevent interaction (avoids confusing state)
      if (!atLatest) return;

      if (
        isSubmittingRef.current ||
        isAdvancingRef.current ||
        !itemId ||
        !isWhiteToMove
      ) {
        return;
      }

      const currentFrom = moveFromRef.current;

      if (currentFrom === null) {
        const game = new Chess(fenRef.current);
        const piece = game.get(selectedSquare);

        if (piece && piece.color === "w") {
          setMoveFrom(selectedSquare);
          moveFromRef.current = selectedSquare;
        } else {
          setMoveFrom(null);
          moveFromRef.current = null;
        }
        return;
      }

      if (currentFrom === selectedSquare) {
        setMoveFrom(null);
        moveFromRef.current = null;
        return;
      }

      const from: string = currentFrom;
      const success = processMove(from, selectedSquare);

      if (success) {
        setMoveFrom(null);
        moveFromRef.current = null;
        return;
      }

      const game = new Chess(fenRef.current);
      const piece = game.get(selectedSquare);

      if (piece && piece.color === "w") {
        setMoveFrom(selectedSquare);
        moveFromRef.current = selectedSquare;
      } else {
        setMoveFrom(null);
        moveFromRef.current = null;
      }
    },
    [atLatest, itemId, isWhiteToMove, processMove],
  );

  const chessboardOptions: ChessboardOptions = useMemo(
    () => ({
      position: fen,
      onPieceDrop: handlePieceDrop,
      onSquareClick: onSquareClick,
      squareStyles: combinedSquareStyles,
      showAnimations: showAnimations,
      allowDrawingArrows: true,
    }),
    [fen, handlePieceDrop, onSquareClick, combinedSquareStyles, showAnimations],
  );

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
                <Chessboard options={chessboardOptions} />
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
