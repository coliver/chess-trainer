// frontend/src/hooks/useTrainingSession.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api";
import { Chess } from "chess.js";

const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export type NextItem = {
  data: any;
  nextFen: string;
  nextItemId: string;
  nextOpeningLabel: string;
  nextCorrectMoveUci: string;
  nextPgn: string;
  nextEpd: string;
};

function normalizeFen(raw: unknown) {
  if (raw == null) return START_FEN;

  let s = String(raw).trim();
  if (!s) return START_FEN;

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

  return `${placement} ${activeColor} ${castling} ${enPassant} ${halfmove} ${fullmove}`;
}

export function useTrainingSession(id: string | undefined, on401Navigate: () => void) {
  const [itemId, setItemId] = useState("");
  const [fen, setFen] = useState(START_FEN);
  const [correctMoveUci, setCorrectMoveUci] = useState("");
  const [feedback, setFeedback] = useState("");
  const [openingLabel, setOpeningLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const isMountedRef = useRef(true);
  const advanceTimeoutRef = useRef<number | null>(null);
  const autoPlayedItemIdRef = useRef<string | null>(null);
  const prevFenRef = useRef<string>(START_FEN);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (advanceTimeoutRef.current) window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    };
  }, []);

  const fetchNextItem = useCallback(async (): Promise<NextItem> => {
    if (!id) throw new Error("Missing training session id");

    const res = await api.get(`/training-sessions/${id}/next`);
    const data = res.data;

    const raw = data?.fen_after ?? data?.fen ?? data?.epd;
    const nextFen = normalizeFen(raw);

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
  }, [id]);

  const applyNextItemState = useCallback((next: NextItem) => {
    setItemId(next.nextItemId);
    setFen(next.nextFen);
    setOpeningLabel(next.nextOpeningLabel);
    setCorrectMoveUci(next.nextCorrectMoveUci);
  }, []);

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
        if (err?.response?.status === 401) on401Navigate();
        setFeedback("No more moves in this session or session expired.");
      }
    };

    void run();
  }, [id, fetchNextItem, applyNextItemState, on401Navigate]);

  const submitMove = useCallback(
    async (moveUci: string, preFen?: string) => {
      if (!id) return;
      if (!itemId) return;

      const revertFen = preFen ?? fen;
      const prevItemId = itemId;

      setIsSubmitting(true);

      try {
        const res = await api.post(`/training-sessions/${id}/responses`, {
          move_uci: moveUci,
          item_id: itemId,
        });

        if (res.data.correct) {
          setFeedback("✅ Correct!");
          // moveInput clearing stays in component, so we don't touch it here

          const fenAfterNorm =
            res.data.fen_after != null ? normalizeFen(res.data.fen_after) : "";
          if (fenAfterNorm) setFen(fenAfterNorm);

          // advance/opening logic stays here
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

              if (next.nextItemId === prevItemId) {
                setFeedback("✅ Opening complete.");
                setFen(next.nextFen);
                setOpeningLabel(next.nextOpeningLabel);
                setCorrectMoveUci(next.nextCorrectMoveUci);
                return;
              }

              applyNextItemState(next);
              setFeedback("");
            } catch (err: any) {
              if (!isMountedRef.current) return;
              if (err?.response?.status === 401) on401Navigate();
              setFeedback("No more moves in this session or session expired.");
            } finally {
              if (isMountedRef.current) setIsAdvancing(false);
            }
          }, 500);

          return;
        }

        // incorrect move revert
        setFen(revertFen);
        setFeedback(`❌ ${res.data.reason}`);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        if (err?.response?.status === 401) on401Navigate();

        const detail = err?.response?.data?.detail;
        if (err?.response?.status === 404) setFeedback(String(detail || "Session completed."));
        else setFeedback("Error submitting move");
      } finally {
        if (isMountedRef.current) setIsSubmitting(false);
      }
    },
    [id, itemId, fen, fetchNextItem, applyNextItemState, on401Navigate],
  );

  const handleRetry = useCallback(async () => {
    try {
      const next = await fetchNextItem();
      if (!isMountedRef.current) return;
      applyNextItemState(next);
      setFeedback("");
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (err?.response?.status === 401) on401Navigate();
      setFeedback("No more moves in this session or session expired.");
    }
  }, [fetchNextItem, applyNextItemState, on401Navigate]);

  // helper for autoplay guard (we’ll use it from component)
  const shouldAutoplay = useCallback(() => {
    const game = new Chess(fen);
    const turn = game.turn(); // 'w' | 'b'
    return turn === "b";
  }, [fen]);

  const takeAutoplayOnce = useCallback((currentItemId: string) => {
    if (autoPlayedItemIdRef.current === currentItemId) return false;
    autoPlayedItemIdRef.current = currentItemId;
    return true;
  }, []);

  return {
    START_FEN,
    fen,
    setFen,
    itemId,
    correctMoveUci,
    feedback,
    openingLabel,
    isSubmitting,
    isAdvancing,

    normalizeFen, // if your component still needs it
    submitMove,
    handleRetry,

    shouldAutoplay,
    takeAutoplayOnce,
    prevFenRef, // if you still use it in drag-drop for illegal-move revert
  };
}
