// frontend/src/Training.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "./api";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

export const Training = () => {
  const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  const { id } = useParams();
  const navigate = useNavigate();

  const [itemId, setItemId] = useState("");
  const [fen, setFen] = useState(START_FEN);
  const [pgn, setPgn] = useState("");
  const [epd, setEpd] = useState("");
  const [moveInput, setMoveInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isLoggedIn] = useState(() => !!localStorage.getItem("token"));
  const [openingLabel, setOpeningLabel] = useState("");
  const [showAnimations, setShowAnimations] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const chessForFen = useCallback((f: string) => new Chess(f), []);

  const toPositionString = (raw: unknown) => {
    if (raw == null) return START_FEN;
    const s = String(raw).trim();
    return s.includes(";") ? s.split(";")[0].trim() : s; // handles EPD extras
  };

  const fetchNextItem = async () => {
    const res = await api.get(`/training-sessions/${id}/next`);
    console.log("NEXT:", res.data);

    const raw = res.data?.fen_after ?? res.data?.fen ?? res.data?.epd;
    setFen(toPositionString(raw));
    setItemId(res.data?.item_id ?? "");

    setFeedback("");

    setPgn(res.data?.pgn ?? "");
    setEpd(res.data?.epd ?? "");

    setOpeningLabel(
      res.data?.opening_name
        ? `${res.data.opening_eco ?? ""} ${res.data.opening_name}`.trim()
        : "Opening: (unknown)",
    );
  };

  useEffect(() => {
    if (!id) return;

    const run = async () => {
      try {
        await fetchNextItem();
      } catch (err: any) {
        if (err.response?.status === 401) navigate("/login");
        setFeedback("No more moves in this session or session expired.");
      }
    };

    run();
  }, [id, navigate]);

  useEffect(() => {
    console.log("fen state changed:", fen);
  }, [fen]);

  const submitMove = useCallback(
    async (moveUci: string) => {
      if (!id) return;
      if (!itemId) return;

      setIsSubmitting(true);
      try {
        const res = await api.post(`/training-sessions/${id}/responses`, {
          move_uci: moveUci,
          item_id: itemId,
        });

        console.log("submit response:", res.data);

        if (res.data.correct) {
          setFeedback("✅ Correct!");
          setMoveInput("");

          if (res.data.fen_after) setFen(toPositionString(res.data.fen_after));

          setTimeout(async () => {
            try {
              await fetchNextItem();
            } catch (err: any) {
              if (err.response?.status === 401) navigate("/login");
              else if (err.response?.status === 404) {
                setFeedback("✅ Session completed.");
                setItemId("");
              } else {
                setFeedback("Error loading next item");
              }
            }
          }, 1000);

          return;
        }

        if (res.data.fen_after) setFen(toPositionString(res.data.fen_after));
        setFeedback(`❌ ${res.data.reason}`);
      } catch (err: any) {
        if (err.response?.status === 401) navigate("/login");
        const detail = err.response?.data?.detail;

        if (err.response?.status === 404)
          setFeedback(String(detail || "Session completed."));
        else setFeedback("Error submitting move");
      } finally {
        setIsSubmitting(false);
      }
    },
    [id, itemId, navigate, toPositionString],
  );

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    await submitMove(moveInput.trim());
  };

  const handleRetry = async () => {
    try {
      await fetchNextItem();
    } catch (err: any) {
      if (err.response?.status === 401) navigate("/login");
      setFeedback("No more moves in this session or session expired.");
    }
  };

  const handlePieceDrop = useCallback(
    (
      dropOrSourceSquare:
        | { sourceSquare: string; targetSquare: string; piece?: unknown }
        | string,
      maybeTargetSquare?: string,
      maybePiece?: unknown,
    ): boolean => {
      const sourceSquare =
        typeof dropOrSourceSquare === "string"
          ? dropOrSourceSquare
          : dropOrSourceSquare.sourceSquare;
      const targetSquare =
        typeof dropOrSourceSquare === "string"
          ? (maybeTargetSquare ?? "")
          : dropOrSourceSquare.targetSquare;
      const piece =
        typeof dropOrSourceSquare === "string"
          ? maybePiece
          : dropOrSourceSquare.piece;

      console.log("DROP FIRED", { sourceSquare, targetSquare, piece });
      console.log("DROP DEBUG", { isSubmitting, itemId, fen });
      if (isSubmitting) return false;
      if (!itemId) return false;

      const game = new Chess(fen);
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });

      if (move === null) {
        setFeedback("❌ Illegal move");
        return false;
      }

      // Optimistically update the board so the dragged piece "sticks"
      setFen(game.fen());

      const promotionChar = move.promotion
        ? String(move.promotion).toLowerCase()
        : "";
      const uci = `${sourceSquare}${targetSquare}${promotionChar}`;

      // Keep your existing flow
      setMoveInput(uci);
      void submitMove(uci);

      return true;
    },
    [fen, isSubmitting, itemId, submitMove],
  );

  const chessboardOptions = {
    position: fen,
    showAnimations,
    allowDragging: !!itemId && !isSubmitting,
    onPieceDrop: handlePieceDrop,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <h1>Training</h1>
      <p style={{ marginTop: 12, fontWeight: "bold" }}>{openingLabel}</p>
      <div style={{ marginBottom: 8 }}>
        {isLoggedIn ? "Logged in" : "Not logged in"}
      </div>

      <div style={{ width: "400px" }}>
        <Chessboard options={chessboardOptions} />
        <label>
          <input
            type="checkbox"
            checked={showAnimations}
            onChange={() => setShowAnimations(!showAnimations)}
          />
          Show animations
        </label>
      </div>

      <div style={{ marginTop: "20px", width: "400px", textAlign: "center" }}>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", gap: "10px", justifyContent: "center" }}
        >
          <input
            value={moveInput}
            onChange={(e) => setMoveInput(e.target.value)}
            placeholder="e.g. e2e4"
            style={{
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            style={{ padding: "8px 16px", cursor: "pointer" }}
            disabled={isSubmitting}
          >
            Submit
          </button>
          <button
            type="button"
            style={{ padding: "8px 16px", cursor: "pointer" }}
            onClick={handleRetry}
            disabled={isSubmitting}
          >
            Retry?
          </button>
        </form>

        <p>{pgn}</p>
        <p>{epd}</p>

        <p style={{ marginTop: "10px", fontWeight: "bold" }}>{feedback}</p>
      </div>
    </div>
  );
};
