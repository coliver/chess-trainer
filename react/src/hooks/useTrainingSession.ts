//frontend/src/hooks/useTrainingSession.ts
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api";
import { AxiosError } from "axios";
import {
  START_FEN,
  normalizeFen,
  deriveNextItem,
  type NextItemResponse,
} from "@knight-school/chess-core";

export type NextItem = {
  nextFen: string;
  nextItemId: string | null;
  nextOpeningLabel: string;
  nextCorrectMoveUci: string;
};

type TrainingSessionDeps = {
  setTimeoutFn?: typeof window.setTimeout;
  clearTimeoutFn?: typeof window.clearTimeout;
  timeoutMs?: number;
};

export function useTrainingSession(
  id: string | undefined,
  on401Navigate: () => void,
  deps: TrainingSessionDeps = {},
) {
  const setTimeoutFn = deps.setTimeoutFn ?? window.setTimeout;
  const clearTimeoutFn = deps.clearTimeoutFn ?? window.clearTimeout;
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

  const fetchNextItem = useCallback(async (): Promise<NextItem> => {
    if (!id) throw new Error("Missing training session id");

    const response = await api.get<NextItemResponse>(
      `training-sessions/${id}/next`,
    );
    const data = response.data;

    // Use the core function to parse the response
    const derived = deriveNextItem(data);

    return {
      nextFen: derived.fen,
      nextItemId: derived.itemId,
      nextOpeningLabel: derived.openingLabel,
      nextCorrectMoveUci: derived.correctMoveUci,
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
      } catch (unknownErr) {
        const err = unknownErr as AxiosError<{ detail?: string }>;
        if (!isMountedRef.current) return;
        if ((err?.response?.status ?? err?.status) === 401) on401Navigate();
        setFeedback("No more moves in this session or session expired.");
      }
    };

    void run();
  }, [id, fetchNextItem, applyNextItemState, on401Navigate]);

  // Shape your backend actually returns
  type SubmitMoveResponse = {
    correct: boolean;
    reason?: string;
    fenAfter?: string | null;
    sessionCompleted?: boolean;
  };

  type ApiErrorBody = {
    detail?: string;
  };

  const submitMove = useCallback(
    async (moveUci: string, preFen: string, options: { silent?: boolean } = {}) => {
      if (!id || itemId == null) return;
      const silent = options.silent ?? false;

      if (!preFen) {
        // If you ever see this, callers are not passing fenRef.current correctly.
        // (Prefer fail-fast over silently reverting to a stale fen.)
        throw new Error("submitMove requires preFen (current position fen).");
      }

      const revertFen = preFen;
      const prevItemId = itemId;

      setIsSubmitting(true);

      try {
        const response = await api.post<SubmitMoveResponse>(
          `training-sessions/${id}/responses`,
          {
            moveUci,
            itemId: itemId,
          },
        );

        const data = response.data;

        if (data.correct) {
          if (!silent) setFeedback("✅ Correct!");

          const fenAfterNorm =
            data.fenAfter != null ? normalizeFen(data.fenAfter) : "";
          if (fenAfterNorm) setFen(fenAfterNorm);

          if (data.sessionCompleted) {
            // Prevent any queued timeout from firing after session end
            if (advanceTimeoutRef.current) {
              clearTimeoutFn(advanceTimeoutRef.current);
              advanceTimeoutRef.current = null;
            }

            setFeedback("✅ Session completed.");
            setIsSessionCompleted(true);
            setIsAdvancing(false);
            setIsSubmitting(false);
            return;
          }
          setIsAdvancing(true);

          const nextPromise = fetchNextItem();
          // Attach a no-op handler so an early rejection doesn't surface as an
          // unhandled rejection before the setTimeout callback below awaits it.
          nextPromise.catch(() => {});

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
            } catch (unknownErr) {
              if (!isMountedRef.current) return;

              const err = unknownErr as AxiosError<ApiErrorBody>;
              const status = err.response?.status;
              if (status === 401) on401Navigate();

              setFeedback("No more moves in this session or session expired.");
            } finally {
              if (isMountedRef.current) setIsAdvancing(false);
            }
          }, timeoutMs);

          setIsSubmitting(false);
          return;
        }

        // incorrect move => revert to the exact fen used to submit
        setFen(revertFen);
        setFeedback(`❌ ${data.reason ?? "Incorrect move"}`);
      } catch (unknownErr) {
        const err = unknownErr as AxiosError<ApiErrorBody>;

        if (!isMountedRef.current) return;

        const status = err.response?.status;
        if (status === 401) on401Navigate();

        const detail = err.response?.data?.detail;

        if (status === 404) {
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
      fetchNextItem,
      applyNextItemState,
      on401Navigate,
      clearTimeoutFn,
      setTimeoutFn,
      timeoutMs,
    ],
  );


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
    takeAutoplayOnce,
    prevFenRef,
  };
}
