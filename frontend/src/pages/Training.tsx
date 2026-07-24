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
    handleRetry,
    takeAutoplayOnce,
  } = useTrainingSession(id, handle401);

  const [moveInput, setMoveInput] = useState("");
  const [showAnimations, setShowAnimations] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [localFeedback, setLocalFeedback] = useState("");
  const shownFeedback = localFeedback || feedback;

  const [moveFrom, setMoveFrom] = useState<string | null>(null);

  const moveFromRef = useRef<string | null>(null);
  const fenRef = useRef(fen);
  const lastSubmittedMoveUciRef = useRef<string>("");
  const isSubmittingRef = useRef(isSubmitting);
  const isAdvancingRef = useRef(isAdvancing);
  const lastAutoplayedItemIdRef = useRef<string | null>(null);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHintLevel(0); 
    setMoveFrom(null);
    moveFromRef.current = null;
    setLocalFeedback("");
  }, [itemId]);

  useEffect(() => {
    if (feedback === "✅ Correct!" && lastSubmittedMoveUciRef.current) {
      blinkGreen(lastSubmittedMoveUciRef.current, 2);
    }
  }, [feedback, blinkGreen]);

  const isWhiteToMove = useMemo(() => new Chess(fen).turn() === "w", [fen]);

  useEffect(() => {
    // Guard 1: Basic data requirements
    if (!id || !itemId || isSubmitting || isAdvancing || !correctMoveUci)
      return;

    // Guard 2: Hard Lock - If we already processed this itemId, STOP.
    // This is the most important line in the component.
    if (lastAutoplayedItemIdRef.current === itemId) return;

    // Guard 3: Only run if it is the opponent's (black) turn
    const game = new Chess(fen);
    if (game.turn() !== "b") return;

    // Guard 4: Hook-level lock (keep it as a secondary safety)
    if (!takeAutoplayOnce(itemId)) return;

    // --- LOCK THE ITEM IMMEDIATELY ---
    // We set the ref BEFORE the async call so that the next
    // render cycle (which happens milliseconds later) hits Guard 2.
    lastAutoplayedItemIdRef.current = itemId;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalFeedback("");
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

  const handleRetryClick = async () => {
    setLocalFeedback("");
    setMoveInput("");
    setHintLevel(0);
    await handleRetry();
  };

  const getArrowsForHintLevel = (
    hintLevel: number,
    correctMoveUci: string | null | undefined,
  ) => {
    if (hintLevel < 3 || !correctMoveUci || correctMoveUci.length < 4) {
      return [];
    }

    const from = correctMoveUci.substring(0, 2);
    const to = correctMoveUci.substring(2, 4);

    // v5's internal .match() will crash if these aren't exactly [a-h][1-8]
    const squareRegex = /^[a-h][1-8]$/;
    if (!squareRegex.test(from) || !squareRegex.test(to)) {
      return [];
    }

    return [{ from, to, color: "yellow" }];
  };

  const processMove = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      // Use .current here so this function doesn't need to change when state changes
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

  const combinedSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = { ...squareStyles };

    if (moveFrom) {
      styles[moveFrom] = { background: "yellow" }; // Changed from backgroundColor and rgba
    }

    if (correctMoveUci && hintLevel > 0) {
      const fromSquare = correctMoveUci.substring(0, 2);
      const toSquare = correctMoveUci.substring(2, 4);
      const highlightStyle = { background: "yellow" }; // Changed from backgroundColor and rgba

      if (hintLevel === 1) styles[fromSquare] = highlightStyle;
      if (hintLevel >= 2) {
        styles[fromSquare] = highlightStyle;
        styles[toSquare] = highlightStyle;
      }
    }
    return styles;
  }, [squareStyles, moveFrom, correctMoveUci, hintLevel]);

  const customArrows = useMemo(() => {
    // 1. Basic guards
    if (!correctMoveUci || hintLevel < 3) return [];

    // 2. Strict UCI format check (must be at least 4 chars: [a-h][1-8][a-h][1-8])
    const uciPattern = /^[a-h][1-8][a-h][1-8]/;
    if (!uciPattern.test(correctMoveUci)) return [];

    return [
      {
        from: correctMoveUci.substring(0, 2),
        to: correctMoveUci.substring(2, 4),
        color: "yellow",
      },
    ];
  }, [correctMoveUci, hintLevel]);

  const onSquareClick = useCallback(
    (payload: { square: string }) => {
      const square = payload.square;
      if (!square) return;

      // Use .current here
      if (
        isSubmittingRef.current ||
        isAdvancingRef.current ||
        !itemId ||
        !isWhiteToMove
      )
        return;

      const currentFrom = moveFromRef.current;

      if (currentFrom) {
        if (currentFrom === square) {
          setMoveFrom(null);
          moveFromRef.current = null;
          return;
        }

        const success = processMove(currentFrom, square);
        if (success) {
          setMoveFrom(null);
          moveFromRef.current = null;
        } else {
          const game = new Chess(fenRef.current);
          const piece = game.get(square as any);
          if (piece && piece.color === "w") {
            setMoveFrom(square);
            moveFromRef.current = square;
          } else {
            setMoveFrom(null);
            moveFromRef.current = null;
          }
        }
      } else {
        const game = new Chess(fenRef.current);
        const piece = game.get(square as any);
        if (piece && piece.color === "w") {
          setMoveFrom(square);
          moveFromRef.current = square;
        }
      }
    },
    [itemId, isWhiteToMove, processMove], // REMOVED isSubmitting and isAdvancing from here
  );

  const chessboardOptions = useMemo(
    () => ({
      position: fen,
      onPieceDrop: handlePieceDrop,
      onSquareClick: onSquareClick,
      squareStyles: combinedSquareStyles, // Fixed property name
      arrows: customArrows,
      showAnimations: showAnimations,
      customArrows: getArrowsForHintLevel(hintLevel, correctMoveUci),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      fen,
      handlePieceDrop,
      onSquareClick,
      combinedSquareStyles,
      customArrows,
      showAnimations,
      hintLevel,
    ],
  );

  return (
    <main className="page">
      <div className="card">
        <h1 className="title">Training</h1>
        <h2 className="opening-label">{openingLabel}</h2>
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {/* Left Column */}
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

            {/* Right Column */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <button className="btn" onClick={() => setShowPanel((s) => !s)}>
                {showPanel ? "Hide" : "Show"} Panel
              </button>
              <div
                style={{ marginTop: 12, display: showPanel ? "block" : "none" }}
              >
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
