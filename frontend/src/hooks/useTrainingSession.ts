import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api";
import { Chess } from "chess.js";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export type NextItem = {
  data: any;
  nextFen: string;
  nextItemId: string | number;
  nextOpeningLabel: string;
  nextCorrectMoveUci: string;
  nextPgn: string;
  nextEpd: string;
};

function normalizeFen(raw: unknown) {
  if (raw == null) return START_FEN;
  const s = String(raw).trim();
  if (!s) return START_FEN;

  const clean = s.split("|")[0].split(";")[0].trim();
  return clean || START_FEN;
}

export function useTrainingSession(
  id: string | undefined,
  on401Navigate: () => void,
) {
  const [itemId, setItemId] = useState<string | number>("");
  const [fen, setFen] = useState(START_FEN);
  const [correctMoveUci, setCorrectMoveUci] = useState("");
  const [feedback, setFeedback] = useState("");
  const [openingLabel, setOpeningLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const isMountedRef = useRef(true);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPlayedItemIdRef = useRef<string | null>(null);
  const prevFenRef = useRef<string>(START_FEN);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (advanceTimeoutRef.current)
        window.clearTimeout(advanceTimeoutRef.current);
    };
  }, []);

  const fetchNextItem = useCallback(async (): Promise<NextItem> => {
    if (!id) throw new Error("Missing training session id");

    const response = await api.get(`/training-sessions/${id}/next`);
    const data = response?.data ?? response;

    const raw = data?.fen_after ?? data?.fen ?? data?.epd;
    const nextFen = normalizeFen(raw);
    const nextItemId = data?.item_id ?? data?.id ?? "";
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

  // Load initial item
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
      if (!id || itemId === "") return;

      const revertFen = preFen ?? fen;
      const prevItemId = itemId;

      setIsSubmitting(true);

      try {
        const response = await api.post(`/training-sessions/${id}/responses`, {
          move_uci: moveUci,
          item_id: itemId,
        });

        const data = response?.data ?? response;

        if (data?.correct) {
          setFeedback("✅ Correct!");

          const fenAfterNorm =
            data.fen_after != null ? normalizeFen(data.fen_after) : "";
          if (fenAfterNorm) setFen(fenAfterNorm);

          if (data.session_completed) {
            setFeedback("✅ Session completed.");
            setIsSubmitting(false);
            return;
          }

          setIsAdvancing(true);

          // Start the fetch immediately, but wait for the timeout to apply the state
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
              } else {
                applyNextItemState(next);
                setFeedback("");
              }
            } catch (err: any) {
              if (!isMountedRef.current) return;
              if (err?.response?.status === 401) on401Navigate();
              setFeedback("No more moves in this session or session expired.");
            } finally {
              if (isMountedRef.current) setIsAdvancing(false);
            }
          }, 500);

          setIsSubmitting(false);
          return;
        }

        setFen(revertFen);
        setFeedback(`❌ ${data?.reason ?? "Incorrect move"}`);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        if (err?.response?.status === 401) on401Navigate();

        const detail = err?.response?.data?.detail;
        if (err?.response?.status === 404) {
          setFeedback(String(detail || "Session completed."));
        } else {
          setFeedback("Error submitting move");
        }
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

  const shouldAutoplay = useCallback(() => {
    const normalized = normalizeFen(fen);
    try {
      const game = new Chess(normalized);
      return game.turn() === "b";
    } catch {
      
      return false;
    }
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
    normalizeFen,
    submitMove,
    handleRetry,
    shouldAutoplay,
    takeAutoplayOnce,
    prevFenRef,
  };
}
