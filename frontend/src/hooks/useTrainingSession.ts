//frontend/src/hooks/useTrainingSession.ts
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api";
import { Chess } from "chess.js";

const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export type NextItem = {
  data: any;
  nextFen: string;
  nextItemId: string | null;
  nextOpeningLabel: string;
  nextCorrectMoveUci: string;
  nextNextPgn?: string;
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

type TrainingSessionDeps = {
  setTimeoutFn?: typeof window.setTimeout;
  clearTimeoutFn?: typeof window.clearTimeout;
  chessFactory?: (fen: string) => { turn: () => string };
  timeoutMs?: number;
};

export function useTrainingSession(
  id: string | undefined,
  on401Navigate: () => void,
  deps: TrainingSessionDeps = {},
) {
  const setTimeoutFn = deps.setTimeoutFn ?? window.setTimeout;
  const clearTimeoutFn = deps.clearTimeoutFn ?? window.clearTimeout;
  const chessFactory = deps.chessFactory ?? ((fen: string) => new Chess(fen));
  const timeoutMs = deps.timeoutMs ?? 500;

  const [itemId, setItemId] = useState<string | null>(null);
  const [fen, setFen] = useState(START_FEN);
  const [correctMoveUci, setCorrectMoveUci] = useState("");
  const [feedback, setFeedback] = useState("");
  const [openingLabel, setOpeningLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isSessionCompleted, setIsSessionCompleted] = useState(false);

  const isMountedRef = useRef(true);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPlayedItemIdRef = useRef<string | null>(null);
  const prevFenRef = useRef<string>(START_FEN);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (advanceTimeoutRef.current) {
        clearTimeoutFn(advanceTimeoutRef.current);
      }
    };
  }, [clearTimeoutFn]);

  useEffect(() => {
    setIsSessionCompleted(false);
  }, [id]);

  const fetchNextItem = useCallback(async (): Promise<NextItem> => {
    if (!id) throw new Error("Missing training session id");

    const response = await api.get(`training-sessions/${id}/next`);
    const data = (response as any)?.data ?? response;

    const raw = data?.fenAfter ?? data?.fen ?? data?.epd;
    const nextFen = normalizeFen(raw);

    const nextItemIdRaw = data?.itemId ?? data?.id;
    const nextItemId =
      nextItemIdRaw == null || nextItemIdRaw === ""
        ? null
        : String(nextItemIdRaw);

    const nextOpeningLabel = data?.openingName
      ? `${data.openingEco ?? ""} ${data.openingName}`.trim()
      : "Opening: (unknown)";

    return {
      data,
      nextFen,
      nextItemId,
      nextOpeningLabel,
      nextCorrectMoveUci: data?.correctMoveUci ?? "",
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
        setIsSessionCompleted(false);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        if ((err?.response?.status ?? err?.status) === 401) on401Navigate();
        setFeedback("No more moves in this session or session expired.");
      }
    };

    void run();
  }, [id, fetchNextItem, applyNextItemState, on401Navigate]);

  const submitMove = useCallback(
    async (moveUci: string, preFen?: string) => {
      if (!id || itemId == null) return;

      const revertFen = preFen ?? fen;
      const prevItemId = itemId;

      setIsSubmitting(true);

      try {
        const response = await api.post(`training-sessions/${id}/responses`, {
          moveUci: moveUci,
          itemId: itemId,
        });

        const data = (response as any)?.data ?? response;

        if (data?.correct) {
          setFeedback("✅ Correct!");

          const fenAfterNorm =
            data.fenAfter != null ? normalizeFen(data.fenAfter) : "";
          if (fenAfterNorm) setFen(fenAfterNorm);

          if (data.sessionCompleted) {
            setFeedback("✅ Session completed.");
            setIsSessionCompleted(true);
            setIsSubmitting(false);
            return;
          }

          setIsAdvancing(true);

          const nextPromise = fetchNextItem();

          if (advanceTimeoutRef.current) {
            clearTimeoutFn(advanceTimeoutRef.current);
          }

          advanceTimeoutRef.current = setTimeoutFn(async () => {
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
                setIsSessionCompleted(false);
              }
            } catch (err: any) {
              if (!isMountedRef.current) return;
              if ((err?.response?.status ?? err?.status) === 401)
                on401Navigate();
              setFeedback("No more moves in this session or session expired.");
            } finally {
              if (isMountedRef.current) setIsAdvancing(false);
            }
          }, timeoutMs);

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
    [
      id,
      itemId,
      fen,
      fetchNextItem,
      applyNextItemState,
      on401Navigate,
      clearTimeoutFn,
      setTimeoutFn,
      timeoutMs,
    ],
  );

  const handleRetry = useCallback(async () => {
    try {
      const next = await fetchNextItem();
      if (!isMountedRef.current) return;
      applyNextItemState(next);
      setFeedback("");
      setIsSessionCompleted(false);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (err?.response?.status === 401) on401Navigate();
      setFeedback("No more moves in this session or session expired.");
    }
  }, [fetchNextItem, applyNextItemState, on401Navigate]);

  const shouldAutoplay = useCallback(() => {
    const normalized = normalizeFen(fen);
    try {
      const game = chessFactory(normalized);
      return game.turn() === "b";
    } catch {
      return false;
    }
  }, [fen, chessFactory]);

  const takeAutoplayOnce = useCallback((currentItemId: string | number) => {
    const key = String(currentItemId);
    if (autoPlayedItemIdRef.current === key) return false;
    autoPlayedItemIdRef.current = key;
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
    isSessionCompleted,
    normalizeFen,
    submitMove,
    handleRetry,
    shouldAutoplay,
    takeAutoplayOnce,
    prevFenRef,
  };
}
