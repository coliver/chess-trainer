import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import api from "../api";
import { StartNewTrainingButton } from "../components/StartNewTrainingButton";
import FenTurnBadge from "../components/FenTurnBadge";
import { useBlinkGreen } from "../hooks/useBlinkGreen";
import { useTrainingSession } from "../hooks/useTrainingSession";

export const Training = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { blinkGreen, squareStyles } = useBlinkGreen();

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
    handleRetry,
    takeAutoplayOnce,
  } = useTrainingSession(id, () => navigate("/login"));

  const [moveInput, setMoveInput] = useState("");
  const [showAnimations, setShowAnimations] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [localFeedback, setLocalFeedback] = useState("");
  const shownFeedback = localFeedback || feedback;
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const lastSubmittedMoveUciRef = useRef<string>("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHintLevel(0);
    setMoveFrom(null);
    setLocalFeedback("");
  }, [itemId]);

  useEffect(() => {
    if (feedback === "✅ Correct!" && lastSubmittedMoveUciRef.current) {
      blinkGreen(lastSubmittedMoveUciRef.current, 2);
    }
  }, [feedback, blinkGreen]);

  const isWhiteToMove = useMemo(() => new Chess(fen).turn() === "w", [fen]);

  useEffect(() => {
    if (!id || !itemId || isSubmitting || isAdvancing || !correctMoveUci)
      return;
    const game = new Chess(fen);
    if (game.turn() !== "b") return;
    if (!takeAutoplayOnce(itemId)) return;
    if (localFeedback !== "") setLocalFeedback("");
    lastSubmittedMoveUciRef.current = correctMoveUci;
    void submitMove(correctMoveUci, fen);
  }, [
    id,
    itemId,
    fen,
    correctMoveUci,
    isSubmitting,
    isAdvancing,
    takeAutoplayOnce,
    submitMove,
    localFeedback,
  ]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const uci = moveInput.trim();
    if (!uci) return;
    setLocalFeedback("");
    lastSubmittedMoveUciRef.current = uci;
    await submitMove(uci, fen);
    setMoveInput("");
  };

  const handleRetryClick = async () => {
    setLocalFeedback("");
    setMoveInput("");
    setHintLevel(0);
    await handleRetry();
  };

  const processMove = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      if (isSubmitting || isAdvancing || !itemId) return false;

      const uciPrefix = `${sourceSquare}${targetSquare}`;
      const expectedPromo = correctMoveUci.startsWith(uciPrefix)
        ? correctMoveUci.slice(uciPrefix.length)
        : "";
      const promoForMove = expectedPromo ? expectedPromo : "q";

      const game = new Chess(fen);
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promoForMove,
      });

      if (move === null) {
        setLocalFeedback("❌ Illegal move");
        return false;
      }

      const preFen = fen;
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
    [
      fen,
      itemId,
      isSubmitting,
      isAdvancing,
      setFen,
      submitMove,
      correctMoveUci,
    ],
  );

  const handlePieceDrop = useCallback(
    (dropOrSourceSquare: any, maybeTargetSquare?: string): boolean => {
      const sourceSquare =
        typeof dropOrSourceSquare === "string"
          ? dropOrSourceSquare
          : dropOrSourceSquare.sourceSquare;
      const targetSquare =
        typeof dropOrSourceSquare === "string"
          ? (maybeTargetSquare ?? "")
          : dropOrSourceSquare.targetSquare;
      return processMove(sourceSquare, targetSquare);
    },
    [processMove],
  );

  const startSession = async () => {
    try {
      const response = await api.post("/training-sessions");
      navigate(`/training/${response.data.id}`);
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };

  const hintStyles = useMemo(() => {
    const styles: any = {};

    // Selected square highlight (Click-to-move)
    if (moveFrom) {
      styles[moveFrom] = { backgroundColor: "rgba(0, 0, 255, 0.4)" };
    }

    if (!correctMoveUci || hintLevel === 0) return styles;
    const fromSquare = correctMoveUci.substring(0, 2);
    const toSquare = correctMoveUci.substring(2, 4);
    const highlightStyle = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
    if (hintLevel === 1) styles[fromSquare] = highlightStyle;
    if (hintLevel >= 2) {
      styles[fromSquare] = highlightStyle;
      styles[toSquare] = highlightStyle;
    }
    return styles;
  }, [correctMoveUci, hintLevel, moveFrom]);

  const customArrows = useMemo(() => {
    if (!correctMoveUci || hintLevel < 3) return [];
    return [
      {
        from: correctMoveUci.substring(0, 2),
        to: correctMoveUci.substring(2, 4),
        color: "yellow",
      },
    ];
  }, [correctMoveUci, hintLevel]);

  const onSquareClick = useCallback(
    (payload: { square: string; piece?: { pieceType?: string } }) => {
      const square = payload?.square;
      if (!square) return;

      if (isSubmitting || isAdvancing || !itemId || !isWhiteToMove) return;

      if (moveFrom) {
        if (moveFrom === square) {
          setMoveFrom(null);
          return;
        }

        processMove(moveFrom, square);
        setMoveFrom(null);
      } else {
        const game = new Chess(fen);
        const piece = game.get(square as any);
        if (piece && piece.color === "w") {
          setMoveFrom(square);
        }
      }
    },
    [
      moveFrom,
      isSubmitting,
      isAdvancing,
      itemId,
      isWhiteToMove,
      processMove,
      fen,
    ],
  );

  const chessboardOptions = useMemo(
    () => ({
      position: fen,
      showAnimations,
      allowDragging: !!itemId && !isSubmitting && !isAdvancing && isWhiteToMove,
      onPieceDrop: handlePieceDrop,
      onSquareClick: onSquareClick, // <--- Add this
      squareStyles: { ...squareStyles, ...hintStyles },
      customArrows: customArrows,
      allowDrawingArrows: true,
    }),
    [
      fen,
      showAnimations,
      itemId,
      isSubmitting,
      isAdvancing,
      isWhiteToMove,
      handlePieceDrop,
      onSquareClick,
      squareStyles,
      hintStyles,
      customArrows,
    ],
  );

  return (
    <main className="page">
      <div className="card">
        <h1 className="title">Training</h1>
        <h2 className="opening-label">{openingLabel}</h2>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="training-board-wrap"
                style={{ position: "relative", marginTop: 0 }}
              >
                <Chessboard options={chessboardOptions} />
              </div>

              <div style={{ marginTop: 20 }}>
                <form className="training-form" onSubmit={handleSubmit}>
                  <input
                    className="text-input"
                    value={moveInput}
                    onChange={(e) => setMoveInput(e.target.value)}
                    placeholder="e.g. e2e4"
                    disabled={isSubmitting}
                  />
                  <button
                    className="btn"
                    type="submit"
                    disabled={isSubmitting || isAdvancing}
                  >
                    Submit
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setHintLevel((h) => h + 1)}
                    disabled={isSubmitting || !itemId}
                  >
                    {hintLevel === 0
                      ? "Hint"
                      : hintLevel === 1
                        ? "More Hint"
                        : hintLevel === 2
                          ? "Full Hint"
                          : "Max Hint"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={handleRetryClick}
                    disabled={isSubmitting}
                  >
                    Retry?
                  </button>
                  <FenTurnBadge fen={fen} />
                </form>
                <p className="training-feedback">{shownFeedback}</p>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <button className="btn" onClick={() => setShowPanel((s) => !s)}>
                {showPanel ? "Hide" : "Show"} Panel
              </button>
              <div style={{ marginTop: 12, display: showPanel ? "" : "none" }}>
                <StartNewTrainingButton className="btn" onClick={startSession}>
                  Start New Training Session
                </StartNewTrainingButton>
                <h2 style={{ marginTop: 12 }}>{correctMoveUci}</h2>
                <label
                  style={{
                    marginTop: 12,
                    display: "inline-flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showAnimations}
                    onChange={() => setShowAnimations((v) => !v)}
                  />
                  Show animations
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
