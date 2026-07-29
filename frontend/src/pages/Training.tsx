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

  useEffect(() => {
    if (!id || !itemId || isSubmitting || isAdvancing || !correctMoveUci)
      return;
    if (lastAutoplayedItemIdRef.current === itemId) return;

    const game = new Chess(fen);
    if (game.turn() !== "b") return;

    if (!takeAutoplayOnce(itemId)) return;

    lastAutoplayedItemIdRef.current = itemId;

    lastSubmittedMoveUciRef.current = correctMoveUci;
    void submitMove(correctMoveUci, fen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, itemId, fen, correctMoveUci, takeAutoplayOnce, submitMove]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const uci = moveInput.trim();
    if (!uci) return;

    setLocalFeedback("");
    lastSubmittedMoveUciRef.current = uci;
    await submitMove(uci, fen);
    setMoveInput("");
  };

  const processMove = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      if (isSubmittingRef.current || isAdvancingRef.current || !itemId)
        return false;

      const uciPrefix = `${sourceSquare}${targetSquare}`;
      const expectedPromo = correctMoveUci.startsWith(uciPrefix)
        ? correctMoveUci.slice(uciPrefix.length)
        : "";
      const promoForMove = expectedPromo ? expectedPromo : "q";

      const game = new Chess(fenRef.current);
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promoForMove,
      });

      if (move === null) {
        setLocalFeedback("❌ Illegal move");
        return false;
      }

      const preFen = fenRef.current;
      setFen(game.fen());

      const promotionChar = move.promotion
        ? String(move.promotion).toLowerCase()
        : "";
      const uci = `${sourceSquare}${targetSquare}${promotionChar}`;

      setLocalFeedback("");
      lastSubmittedMoveUciRef.current = uci;
      setMoveInput(uci);
      void submitMove(uci, preFen);

      return true;
    },
    [itemId, setFen, submitMove, correctMoveUci],
  );

  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      return processMove(sourceSquare, targetSquare);
    },
    [processMove],
  );


  const combinedSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = { ...squareStyles };

    if (moveFrom) {
      styles[moveFrom] = { backgroundColor: "rgba(255, 255, 0, 0.35)" };
    }

    if (correctMoveUci && hintLevel >= 0) {
      const fromSquare = correctMoveUci.substring(0, 2);
      const toSquare = correctMoveUci.substring(2, 4);
      const highlightStyle = { backgroundColor: "rgba(255, 255, 0, 0.35)" };

      if (hintLevel === 0) {
        styles[fromSquare] = highlightStyle;
      }
      if (hintLevel === 1) {
        styles[fromSquare] = highlightStyle;
        styles[toSquare] = highlightStyle;
      }
    }

    return styles;
  }, [squareStyles, moveFrom, correctMoveUci, hintLevel]);

  const onSquareClick = useCallback(
    ({ square }: SquareHandlerArgs): void => {
      const selectedSquare = square as Square;
      if (!selectedSquare) return;

      if (
        isSubmittingRef.current ||
        isAdvancingRef.current ||
        !itemId ||
        !isWhiteToMove
      ) {
        return;
      }

      const currentFrom = moveFromRef.current;

      // No "from" selected yet: choose it if it's a white piece.
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

      // "from" selected: clicking it again toggles off.
      if (currentFrom === selectedSquare) {
        setMoveFrom(null);
        moveFromRef.current = null;
        return;
      }

      // Try the move.
      const from: string = currentFrom; // currentFrom is not null here due to the early return
      const success = processMove(from, selectedSquare);
      if (success) {
        setMoveFrom(null);
        moveFromRef.current = null;
        return;
      }

      // Move failed: allow selecting a new from-square (only if it's white).
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
    [itemId, isWhiteToMove, processMove],
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
        <div className="dashboard-layout">
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
                      className="btn"
                      type="submit"
                      disabled={
                        isSubmitting || isAdvancing || !moveInput.trim()
                      }
                    >
                      Submit
                    </button>

                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => {
                        if (isSubmitting || isAdvancing || !itemId) return;
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
