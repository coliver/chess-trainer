// frontend/src/pages/Training.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  // keep the “illegal move” message local (hook doesn’t export setFeedback)
  const [localFeedback, setLocalFeedback] = useState("");
  const shownFeedback = localFeedback || feedback;

  const lastSubmittedMoveUciRef = useRef<string>("");

  useEffect(() => {
    if (feedback === "✅ Correct!" && lastSubmittedMoveUciRef.current) {
      blinkGreen(lastSubmittedMoveUciRef.current, 2);
    }
  }, [feedback, blinkGreen]);

  const isWhiteToMove = useMemo(() => new Chess(fen).turn() === "w", [fen]);

  useEffect(() => {
    if (!id) return;
    if (!itemId) return;
    if (isSubmitting || isAdvancing) return;
    if (!correctMoveUci) return;

    const game = new Chess(fen);
    if (game.turn() !== "b") return;

    if (!takeAutoplayOnce(itemId)) return;

    setLocalFeedback("");
    lastSubmittedMoveUciRef.current = correctMoveUci;
    void submitMove(correctMoveUci, fen);
  }, [id, itemId, fen, correctMoveUci, isSubmitting, isAdvancing, takeAutoplayOnce, submitMove]);

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
    await handleRetry();
  };

  const handlePieceDrop = useCallback(
    (
      dropOrSourceSquare:
        | { sourceSquare: string; targetSquare: string; piece?: unknown }
        | string,
      maybeTargetSquare?: string,
    ): boolean => {
      const sourceSquare =
        typeof dropOrSourceSquare === "string"
          ? dropOrSourceSquare
          : dropOrSourceSquare.sourceSquare;

      const targetSquare =
        typeof dropOrSourceSquare === "string"
          ? maybeTargetSquare ?? ""
          : dropOrSourceSquare.targetSquare;

      if (isSubmitting || isAdvancing) return false;
      if (!itemId) return false;


      const uciPrefix = `${sourceSquare}${targetSquare}`;
      const expectedPromo = correctMoveUci.startsWith(uciPrefix)
        ? correctMoveUci.slice(uciPrefix.length) // "q" | "r" | "b" | "n" | ""
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

      // optimistic UI update
      setFen(game.fen());

      const promotionChar = move.promotion ? String(move.promotion).toLowerCase() : "";
      const uci = `${sourceSquare}${targetSquare}${promotionChar}`;

      setLocalFeedback("");
      lastSubmittedMoveUciRef.current = uci;
      setMoveInput(uci);
      void submitMove(uci, preFen);

      return true;
    },
    [fen, itemId, isSubmitting, isAdvancing, setFen, submitMove],
  );

  const startSession = async () => {
    try {
      const response = await api.post("/training-sessions");
      navigate(`/training/${response.data.id}`);
    } catch (error) {
      console.error("Error starting session:", error);
      alert("Failed to start session. Check your connection or token.");
    }
  };

  const chessboardOptions = useMemo(
    () => ({
      position: fen,
      showAnimations,
      allowDragging: !!itemId && !isSubmitting && !isAdvancing && isWhiteToMove,
      onPieceDrop: handlePieceDrop,
      squareStyles,
    }),
    [fen, showAnimations, itemId, isSubmitting, isAdvancing, isWhiteToMove, handlePieceDrop],
  );

  return (
    <main className="page">
      <div className="card">
        <h1 className="title">Training</h1>
        <h2 className="opening-label">{openingLabel}</h2>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="training-board-wrap" style={{ marginTop: 0 }}>
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
                  <button className="btn" type="submit" disabled={isSubmitting || isAdvancing}>
                    Submit
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

                <h2>{correctMoveUci}</h2>

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
