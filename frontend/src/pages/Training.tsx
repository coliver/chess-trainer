// frontend/src/Training.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { StartNewTrainingButton } from "../components/StartNewTrainingButton";
import FenTurnBadge, { fenTurn } from "../components/FenTurnBadge";

export const Training = () => {
  const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  const { id } = useParams();
  const navigate = useNavigate();

  const [itemId, setItemId] = useState("");
  const [fen, setFen] = useState(START_FEN);
  const [correctMoveUci, setCorrectMoveUci] = useState("");
  const [whiteToMove, setWhiteToMove] = useState(true);
  const [moveInput, setMoveInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [openingLabel, setOpeningLabel] = useState("");
  const [showAnimations, setShowAnimations] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [blinkSquare, setBlinkSquare] = useState<string | null>(null);
  const blinkTimerRef = React.useRef<number | null>(null);
  const [blinkOpacity, setBlinkOpacity] = useState(0);
  const blinkRafRef = React.useRef<number | null>(null);

  const blinkGreen = (uci: string, times = 3) => {
    const toSquare = uci.slice(2, 4);
    if (!toSquare) return;

    // cancel previous animation
    if (blinkTimerRef.current) window.clearTimeout(blinkTimerRef.current);
    if (blinkRafRef.current) cancelAnimationFrame(blinkRafRef.current);

    setBlinkSquare(toSquare);

    const fadeInMs = 120;
    const holdMs = 120;
    const fadeOutMs = 180;
    const cycleMs = fadeInMs + holdMs + fadeOutMs;

    const totalMs = times * cycleMs;
    const start = performance.now();

    const tick = (now: number) => {
      const t = now - start;

      if (t >= totalMs) {
        setBlinkOpacity(0);
        setBlinkSquare(null);
        return;
      }

      const within = t % cycleMs;

      let o = 0;
      if (within <= fadeInMs) {
        o = within / fadeInMs; // 0 -> 1
      } else if (within <= fadeInMs + holdMs) {
        o = 1; // hold
      } else {
        const outT = within - (fadeInMs + holdMs);
        o = 1 - outT / fadeOutMs; // 1 -> 0
      }

      setBlinkOpacity(Math.max(0, Math.min(1, o)));
      blinkRafRef.current = requestAnimationFrame(tick);
    };

    blinkRafRef.current = requestAnimationFrame(tick);

    blinkTimerRef.current = window.setTimeout(() => {
      setBlinkOpacity(0);
      setBlinkSquare(null);
    }, totalMs + 50);
  };

  const toPositionString = useCallback((raw: unknown) => {
    if (raw == null) return START_FEN;

    let s = String(raw).trim();
    if (!s) return START_FEN;

    s = s.split("|")[0].split(";")[0].trim();

    const parts = s.split(/\s+/);

    if (parts.length === 5) {
      return `${parts.join(" ")} 0 1`;
    }
    if (parts.length >= 6) {
      return parts.slice(0, 6).join(" ");
    }
    return START_FEN;
  }, []);

  const fetchNextItem = useCallback(async () => {
    if (!id) throw new Error("Missing training session id");

    const res = await api.get(`/training-sessions/${id}/next`);
    const data = res.data;

    const raw = data?.fen_after ?? data?.fen ?? data?.epd;
    const nextFen = toPositionString(raw);
    const nextItemId = data?.item_id ?? "";

    const nextOpeningLabel = data?.opening_name
      ? `${data.opening_eco ?? ""} ${data.opening_name}`.trim()
      : "Opening: (unknown)";

    return {
      data,
      nextFen,
      nextItemId,
      nextOpeningLabel,
      nextCorrectMoveUci: data?.correct_move_uci ?? "",
      nextPgn: data?.pgn ?? "",
      nextEpd: data?.epd ?? "",
    };
  }, [id, toPositionString]);

  const applyNextItemState = useCallback(
    (next: Awaited<ReturnType<typeof fetchNextItem>>) => {
      setItemId(next.nextItemId);
      setFen(next.nextFen);
      setOpeningLabel(next.nextOpeningLabel);
      setCorrectMoveUci(next.nextCorrectMoveUci);
      // setPgn(next.nextPgn);
      // setEpd(next.nextEpd);
    },
    [],
  );

  useEffect(() => {
    if (!id) return;

    const run = async () => {
      try {
        const next = await fetchNextItem();
        applyNextItemState(next);
        setFeedback("");
      } catch (err: any) {
        if (err?.response?.status === 401) navigate("/login");
        setFeedback("No more moves in this session or session expired.");
      }
    };

    run();
  }, [id, navigate, applyNextItemState]);

  const submitMove = useCallback(
    async (moveUci: string) => {
      if (!id) return;
      if (!itemId) return;

      const prevItemId = itemId;

      setIsSubmitting(true);
      try {
        const res = await api.post(`/training-sessions/${id}/responses`, {
          move_uci: moveUci,
          item_id: itemId,
        });

        console.log("POST response:", res.data);

        if (res.data.correct) {
          setFeedback("✅ Correct!");
          setMoveInput("");

          // normalize fen_after once and use it for the guard
          const fenAfterNorm =
            res.data.fen_after != null
              ? toPositionString(res.data.fen_after)
              : "";

          if (fenAfterNorm) setFen(fenAfterNorm);

          blinkGreen(moveUci, 2); // Blinky green means you got it right.

          if (res.data.session_completed) {
            setFeedback("✅ Session completed.");
            return;
          }

          setTimeout(async () => {
            try {
              const next = await fetchNextItem();

              // If backend didn't advance the training item, don't overwrite fen_after
              if (next.nextItemId === prevItemId) {
                setFeedback("✅ Opening complete.");
                return;
              }

              applyNextItemState(next);
              setFeedback("");
            } catch (err: any) {
              if (err?.response?.status === 401) navigate("/login");
              setFeedback("No more moves in this session or session expired.");
            }
          }, 1000);

          return;
        }

        // Incorrect move
        if (res.data.fen_after) setFen(toPositionString(res.data.fen_after));
        setFeedback(`❌ ${res.data.reason}`);
      } catch (err: any) {
        if (err?.response?.status === 401) navigate("/login");
        const detail = err?.response?.data?.detail;

        if (err?.response?.status === 404)
          setFeedback(String(detail || "Session completed."));
        else setFeedback("Error submitting move");
      } finally {
        setIsSubmitting(false);
      }
    },
    [id, itemId, navigate, toPositionString, fetchNextItem, applyNextItemState],
  );

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    await submitMove(moveInput.trim());
  };

  const handleRetry = async () => {
    try {
      const next = await fetchNextItem();
      applyNextItemState(next);
      setFeedback("");
    } catch (err: any) {
      if (err?.response?.status === 401) navigate("/login");
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

      // Optimistically update the board
      setFen(game.fen());

      const promotionChar = move.promotion
        ? String(move.promotion).toLowerCase()
        : "";
      const uci = `${sourceSquare}${targetSquare}${promotionChar}`;

      setMoveInput(uci);
      void submitMove(uci);

      return true;
    },
    [fen, isSubmitting, itemId, submitMove],
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

  const chessboardOptions = {
    position: fen,
    showAnimations,
    allowDragging: !!itemId && !isSubmitting,
    onPieceDrop: handlePieceDrop,

    squareStyles: blinkSquare
      ? {
          [blinkSquare]: {
            background: `rgba(0, 255, 0, ${0.08 + 0.35 * blinkOpacity})`,
            boxShadow: `inset 0 0 0 4px rgba(0, 200, 0, ${0.15 + 0.55 * blinkOpacity})`,
            borderRadius: "2px",
          },
        }
      : undefined,
  };

  

  return (
    <main className="page">
      <div className="card">
        <h1 className="title" style={{ marginTop: 0 }}>
          Training
        </h1>

        <h1>{openingLabel}</h1>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {/* Left column: board + form */}
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
                  <button className="btn" type="submit" disabled={isSubmitting}>
                    Submit
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={handleRetry}
                    disabled={isSubmitting}
                  >
                    Retry?
                  </button>
                  <FenTurnBadge fen={fen} />
                </form>

                <p className="training-feedback">{feedback}</p>
              </div>
            </div>

            {/* Right column: panel controls */}
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
