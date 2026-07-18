// frontend/src/pages/Training.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { StartNewTrainingButton } from "../components/StartNewTrainingButton";
import FenTurnBadge from "../components/FenTurnBadge";

export const Training = () => {
  const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  const { id } = useParams();
  const navigate = useNavigate();

  const [itemId, setItemId] = useState("");
  const [fen, setFen] = useState(START_FEN);
  const [correctMoveUci, setCorrectMoveUci] = useState("");
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
  const [isAdvancing, setIsAdvancing] = useState(false);

  const autoPlayedItemIdRef = React.useRef<string | null>(null);
  const advanceTimeoutRef = React.useRef<number | null>(null);
  const isMountedRef = React.useRef(true);

  const sideToMove = new Chess(fen).turn(); // 'w' or 'b'
  const isWhiteToMove = sideToMove === "w";

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (advanceTimeoutRef.current)
        window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;

      if (blinkTimerRef.current) window.clearTimeout(blinkTimerRef.current);
      blinkTimerRef.current = null;

      if (blinkRafRef.current) cancelAnimationFrame(blinkRafRef.current);
      blinkRafRef.current = null;
    };
  }, []);

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
        if (isMountedRef.current) {
          setBlinkOpacity(0);
          setBlinkSquare(null);
        }
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

      if (isMountedRef.current) setBlinkOpacity(Math.max(0, Math.min(1, o)));
      blinkRafRef.current = requestAnimationFrame(tick);
    };

    blinkRafRef.current = requestAnimationFrame(tick);

    blinkTimerRef.current = window.setTimeout(() => {
      if (!isMountedRef.current) return;
      setBlinkOpacity(0);
      setBlinkSquare(null);
    }, totalMs + 50);
  };

  const toPositionString = useCallback((raw: unknown) => {
    if (raw == null) return START_FEN;

    let s = String(raw).trim();
    if (!s) {
      console.log("s was not. returning start fen.");
      return START_FEN;
    }

    // strip EPD extras if present
    s = s.split("|")[0].split(";")[0].trim();

    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length < 4) return START_FEN;

    const placement = parts[0];
    const activeColor = parts[1];
    const castling = parts[2] ?? "-";
    const enPassant = parts[3] ?? "-";

    if (activeColor !== "w" && activeColor !== "b") return START_FEN;

    const halfmove = parts[4] ?? "0";
    const fullmove = parts[5] ?? "1";

    const result = `${placement} ${activeColor} ${castling} ${enPassant} ${halfmove} ${fullmove}`;
    console.log(result);
    return result;
  }, []);

  const fetchNextItem = useCallback(async () => {
    if (!id) throw new Error("Missing training session id");

    const res = await api.get(`/training-sessions/${id}/next`);
    const data = res.data;

    const raw = data?.fen_after ?? data?.fen ?? data?.epd;
    const nextFen = toPositionString(raw);
    const ok = new Chess().load(nextFen);
    console.log("raw:", JSON.stringify(raw));
    console.log("nextFen:", nextFen);
    console.log("fen load ok:", ok);
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
        if (!isMountedRef.current) return;
        applyNextItemState(next);
        setFeedback("");
      } catch (err: any) {
        if (!isMountedRef.current) return;
        if (err?.response?.status === 401) navigate("/login");
        setFeedback("No more moves in this session or session expired.");
      }
    };

    run();
  }, [id, navigate, applyNextItemState, fetchNextItem]);

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

          setIsAdvancing(true);

          const nextPromise = fetchNextItem();

          advanceTimeoutRef.current = window.setTimeout(async () => {
            try {
              const next = await nextPromise;
              if (!isMountedRef.current) return;

              console.log(
                "prevItemId",
                prevItemId,
                "nextItemId",
                next.nextItemId,
                "nextFen",
                next.nextFen,
              );

              if (next.nextItemId === prevItemId) {
                setFeedback("✅ Opening complete.");
                setFen(next.nextFen); // <— apply the updated board
                setOpeningLabel(next.nextOpeningLabel);
                setCorrectMoveUci(next.nextCorrectMoveUci);
                return;
              }

              applyNextItemState(next);
              setFeedback("");
            } catch (err: any) {
              if (!isMountedRef.current) return;
              if (err?.response?.status === 401) navigate("/login");
              setFeedback("No more moves in this session or session expired.");
            } finally {
              if (isMountedRef.current) setIsAdvancing(false);
            }
          }, 500);

          return;
        }

        // Incorrect move
        if (res.data.fen_after) setFen(toPositionString(res.data.fen_after));
        setFeedback(`❌ ${res.data.reason}`);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        if (err?.response?.status === 401) navigate("/login");
        const detail = err?.response?.data?.detail;

        if (err?.response?.status === 404)
          setFeedback(String(detail || "Session completed."));
        else setFeedback("Error submitting move");
      } finally {
        if (isMountedRef.current) setIsSubmitting(false);
      }
    },
    [id, itemId, navigate, toPositionString, fetchNextItem, applyNextItemState],
  );

  useEffect(() => {
    if (!itemId) return;
    if (isSubmitting || isAdvancing) return;

    const game = new Chess(fen);
    const turn = game.turn();

    // auto-play only when it's Black's turn
    if (turn !== "b") return;

    // require the backend-provided best move for the side to move
    if (!correctMoveUci) return;

    // play once per training item
    if (autoPlayedItemIdRef.current === itemId) return;
    autoPlayedItemIdRef.current = itemId;

    // submit the black move exactly like the user would
    void submitMove(correctMoveUci);
  }, [fen, itemId, correctMoveUci, isSubmitting, isAdvancing, submitMove]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    await submitMove(moveInput.trim());
  };

  const handleRetry = async () => {
    try {
      const next = await fetchNextItem();
      if (!isMountedRef.current) return;
      applyNextItemState(next);
      setFeedback("");
    } catch (err: any) {
      if (!isMountedRef.current) return;
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

      if (isSubmitting || isAdvancing) return false;
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
    [fen, isSubmitting, itemId, isAdvancing, submitMove],
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
    allowDragging: !!itemId && !isSubmitting && !isAdvancing && isWhiteToMove,
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
        <h1 className="title">Training</h1>

        <h2 className="opening-label">{openingLabel}</h2>

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
