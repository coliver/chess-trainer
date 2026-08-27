import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import Board, { type BoardArrow, type BoardMarker } from "../components/Board";
import { FlipBoardButton } from "../components/FlipBoardButton";
import {
  sideToMove,
  applyMove,
  applyUci,
  legalMoves,
  pieceColorAt,
  createTimeline,
  appendTimelineFen as coreAppendTimelineFen,
  jumpToIndex as coreJumpToIndex,
  isAtLatest,
  deriveStatus,
  splitOpeningLabel,
  deriveHintMarkers,
} from "@knight-school/chess-core";
import { useBlinkGreen } from "../hooks/useBlinkGreen";
import { useTrainingSession } from "../hooks/useTrainingSession";
import { useBoardOrientation } from "../hooks/useBoardOrientation";
import { usePreferences } from "../context/PreferencesContext";
import { getMoveSound, playSound } from "../utils/sound";
import { celebrateWin } from "../utils/winCelebration";

export const Training = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const { blinkGreen, blinkSquare } = useBlinkGreen();
  const handle401 = useCallback(() => navigate("/login"), [navigate]);

  const {
    fen,
    setFen,
    itemId,
    correctMoveUci,
    playerColor,
    openingLabel,
    feedback,
    isSubmitting,
    isAdvancing,
    submitMove,
    takeAutoplayOnce,
    isSessionCompleted,
  } = useTrainingSession(id, handle401);

  const [moveInput, setMoveInput] = useState("");
  const { preferences } = usePreferences();
  const { orientation, flip, setOrientation } = useBoardOrientation();
  const [hintLevel, setHintLevel] = useState(-1);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(
    null,
  );
  const [localFeedback, setLocalFeedback] = useState("");
  const [isRestarting, setIsRestarting] = useState(false);
  const shownFeedback = localFeedback || feedback;

  // Only the autoplay effect below needs this: eslint's set-state-in-effect
  // rule flags an effect that reads reactive state directly and also calls
  // setState, so this one spot deliberately reads fen via a ref instead.
  const fenRef = useRef(fen);
  const lastSubmittedMoveUciRef = useRef<string>("");
  const lastAutoplayedItemIdRef = useRef<string | null>(null);
  const prevFeedbackRef = useRef<string>(feedback);
  const prevItemIdRef = useRef<string | null>(itemId);
  const pendingMoveRef = useRef<{ from: string; to: string } | null>(null);

  // Timeline: keep both state (for UI render) and a ref (for sync checks in effects)
  const [timeline, setTimeline] = useState(() => createTimeline(fen));
  const timelineRef = useRef(timeline);

  useEffect(() => {
    setTimeline((t) => {
      const current = t.fens[t.index];
      if (current === fen) return t;

      const next = createTimeline(fen);
      timelineRef.current = next;
      return next;
    });
  }, [fen]);

  useEffect(() => {
    timelineRef.current = timeline;
  }, [timeline]);

  useEffect(() => {
    fenRef.current = fen;
  }, [fen]);

  useEffect(() => {
    if (
      prevFeedbackRef.current !== "✅ Correct!" &&
      feedback === "✅ Correct!"
    ) {
      setHintLevel(-1);
      setWrongAttempts(0);
      if (pendingMoveRef.current) {
        setLastMove(pendingMoveRef.current);
        pendingMoveRef.current = null;
      }
    }
    prevFeedbackRef.current = feedback;
  }, [feedback]);

  // Count misses on the submit lifecycle (isSubmitting true -> false), not by
  // diffing feedback text: the backend always reports "❌ wrong move" for any
  // incorrect-but-legal move, so two different wrong tries in a row produce
  // identical feedback text and a text-diff would silently miss the second one.
  const prevIsSubmittingRef = useRef(isSubmitting);
  useEffect(() => {
    const wasSubmitting = prevIsSubmittingRef.current;
    prevIsSubmittingRef.current = isSubmitting;
    if (wasSubmitting && !isSubmitting && feedback.startsWith("❌")) {
      setWrongAttempts((n) => n + 1);
    }
  }, [isSubmitting, feedback]);

  // After 2 misses on this move, reveal the source-square hint; after 2 more
  // (4 total), reveal the target square too and draw an arrow to it. Derived
  // (not stored) so it only ever raises whatever the manual hint button set,
  // and never fights that button's own state via a second effect.
  const effectiveHintLevel = Math.max(
    hintLevel,
    wrongAttempts >= 4 ? 1 : wrongAttempts >= 2 ? 0 : -1,
  );

  useEffect(() => {
    if (feedback === "✅ Correct!" && lastSubmittedMoveUciRef.current) {
      blinkGreen(lastSubmittedMoveUciRef.current, 2);
    }
  }, [feedback, blinkGreen]);

  const prevSessionCompletedRef = useRef(isSessionCompleted);
  useEffect(() => {
    if (isSessionCompleted && !prevSessionCompletedRef.current) {
      celebrateWin();
    }
    prevSessionCompletedRef.current = isSessionCompleted;
  }, [isSessionCompleted]);

  const isPlayerToMove = useMemo(
    () => sideToMove(fen) === playerColor,
    [fen, playerColor],
  );
  const atLatest = isAtLatest(timeline);

  // Auto-orient the board to the trainee's color whenever a new session/item
  // loads — unless the user has locked orientation to a fixed side.
  useEffect(() => {
    if (preferences.board_orientation_mode === "auto") {
      setOrientation(playerColor === "b" ? "black" : "white");
    } else {
      setOrientation(preferences.board_orientation_mode);
    }
  }, [playerColor, preferences.board_orientation_mode, setOrientation]);

  const appendTimelineFen = useCallback((nextFen: string) => {
    setTimeline((t) => {
      const next = coreAppendTimelineFen(t, nextFen);
      timelineRef.current = next; // sync ref immediately
      return next;
    });
  }, []);

  const resetUiForJump = useCallback(() => {
    setLocalFeedback("");
    setMoveInput("");
    setHintLevel(-1);
    pendingMoveRef.current = null;
    setLastMove(null);
  }, []);

  // Reset per-item UI state when advancing to a new training item, without
  // remounting the board (a remount here would flash/reload cm-chessboard).
  useEffect(() => {
    if (prevItemIdRef.current !== itemId) {
      setLocalFeedback("");
      setMoveInput("");
      setHintLevel(-1);
      setWrongAttempts(0);
      setIsRestarting(false);
      pendingMoveRef.current = null;
    }
    prevItemIdRef.current = itemId;
  }, [itemId]);

  const jumpToIndex = useCallback(
    (nextIndex: number) => {
      const current = timelineRef.current;
      const next = coreJumpToIndex(current, nextIndex);
      if (next.index === current.index) return;

      const nextFen = next.fens[next.index] ?? next.fens[0];

      timelineRef.current = next;
      setTimeline(next);

      setFen(nextFen);
      resetUiForJump();
    },
    [resetUiForJump, setFen],
  );

  useEffect(() => {
    if (
      !id ||
      !itemId ||
      isSubmitting ||
      isAdvancing ||
      !correctMoveUci ||
      isSessionCompleted
    ) {
      return;
    }

    if (lastAutoplayedItemIdRef.current === itemId) {
      return;
    }
    // Critical: autoplay MUST only run when we're at the latest timeline position
    const tl = timelineRef.current;
    if (tl.index !== tl.fens.length - 1) {
      return;
    }
    if (sideToMove(fenRef.current) === playerColor) {
      return;
    }

    const can = takeAutoplayOnce(itemId);
    lastAutoplayedItemIdRef.current = itemId;
    lastSubmittedMoveUciRef.current = correctMoveUci;
    if (!can) return;

    // Play the opponent's reply locally to keep the timeline consistent.
    const uci = correctMoveUci;
    const applied = applyUci(fenRef.current, uci);
    if (applied) {
      appendTimelineFen(applied.nextFen);
      setLastMove({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
      playSound("moveOpponent");
    }
    // Opponent's reply, not the player's turn — don't show the "Correct!" banner for it.
    void submitMove(uci, fenRef.current, { silent: true });
  }, [
    id,
    itemId,
    fen,
    correctMoveUci,
    playerColor,
    takeAutoplayOnce,
    submitMove,
    isSubmitting,
    isAdvancing,
    appendTimelineFen,
    isSessionCompleted,
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

  const processMove = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      if (isSubmitting || isAdvancing || !itemId) return false;

      if (!sourceSquare || !targetSquare) return false;

      // ✅ prevent chess.js from being called with from===to
      if (sourceSquare === targetSquare) return false;

      const result = applyMove(fen, sourceSquare, targetSquare, correctMoveUci);
      if (!result) {
        playSound("illegal");
        setLocalFeedback("❌ Illegal move");
        return false;
      }
      setFen(result.nextFen);
      appendTimelineFen(result.nextFen);
      pendingMoveRef.current = { from: sourceSquare, to: targetSquare };

      setLocalFeedback("");
      lastSubmittedMoveUciRef.current = result.uci;
      setMoveInput(result.uci);
      void submitMove(result.uci, fen);
      const sound = getMoveSound(fen, result.uci);
      playSound(sound);
      return true;
    },
    [
      appendTimelineFen,
      correctMoveUci,
      fen,
      isAdvancing,
      isSubmitting,
      itemId,
      setFen,
      submitMove,
    ],
  );

  // Drag and click both funnel through cm-chessboard's move-input validation
  // into the same processMove (chess.js stays the source of truth).
  const onMove = useCallback(
    (from: string, to: string): boolean => {
      if (!from || !to || from === to) return false;
      return processMove(from, to);
    },
    [processMove],
  );

  // Whether the user may pick up the piece on `square` (mirrors the old
  // click/drag guards). Blocks past-timeline positions, in-flight submits,
  // non-white pieces, and off-turn moves.
  const canPickUp = useCallback(
    (square: string): boolean => {
      if (!atLatest) return false;
      if (isSubmitting || isAdvancing || !itemId) return false;
      if (!isPlayerToMove) return false;
      return pieceColorAt(fen, square) === playerColor;
    },
    [
      atLatest,
      fen,
      isAdvancing,
      isSubmitting,
      itemId,
      isPlayerToMove,
      playerColor,
    ],
  );

  // Legal targets for the picked-up piece — rendered as dots by cm-chessboard.
  const getLegalMoves = useCallback(
    (square: string): { to: string; promotion?: string }[] =>
      legalMoves(fen, square),
    [fen],
  );

  // Persistent highlights: hint (from, then from+to) and correct-move blink.
  const markers = useMemo((): BoardMarker[] => {
    const arr: BoardMarker[] = [];

    if (lastMove) {
      arr.push({ square: lastMove.from, type: "lastmove" });
      arr.push({ square: lastMove.to, type: "lastmove" });
    }

    const hint = deriveHintMarkers(
      correctMoveUci,
      effectiveHintLevel,
      isSessionCompleted,
    );
    if (hint) {
      arr.push({ square: hint.from, type: "hint" });
      if (hint.to) arr.push({ square: hint.to, type: "hint" });
    }

    if (blinkSquare) arr.push({ square: blinkSquare, type: "blink" });

    return arr;
  }, [correctMoveUci, effectiveHintLevel, blinkSquare, isSessionCompleted, lastMove]);

  // Arrow to the correct square once the deep hint (level 1) kicks in.
  const hintArrows = useMemo((): BoardArrow[] => {
    if (effectiveHintLevel < 1 || isSessionCompleted || !correctMoveUci) return [];
    return [
      { from: correctMoveUci.slice(0, 2), to: correctMoveUci.slice(2, 4), type: "info" },
    ];
  }, [effectiveHintLevel, isSessionCompleted, correctMoveUci]);

  // Split "C50 Italian Game" into an ECO chip + name for the rail header.
  const { eco, openingName } = splitOpeningLabel(openingLabel);

  // Derive the status banner from the existing feedback / turn / hint state.
  const status = deriveStatus({
    isSessionCompleted,
    feedback: shownFeedback,
    hintLevel: effectiveHintLevel,
    isPlayerToMove,
    playerColor,
  });
  const {
    kind: statusKind,
    icon: statusIcon,
    message: statusMsg,
    sub: statusSub,
  } = status;

  const busy = isSubmitting || isAdvancing;

  const trainAgain = useCallback(async () => {
    setIsRestarting(true);
    try {
      const response = await api.post("/training-sessions", {
        openingEco: eco,
        openingName,
        playerColor,
      });
      navigate(`/training/${response.data.id}`);
    } catch (error) {
      console.error("Error restarting session:", error);
      setIsRestarting(false);
    }
  }, [eco, openingName, playerColor, navigate]);

  return (
    <main className="page">
      <div className="card">
        <div className="train">
          <div className="train-board-col">
            <div className="training-board-wrap">
              <Board
                position={fen}
                orientation={orientation}
                interactive
                moveColor={playerColor === "b" ? "black" : "white"}
                markers={markers}
                arrows={hintArrows}
                getLegalMoves={getLegalMoves}
                onMoveStart={canPickUp}
                onMove={onMove}
              />
            </div>
            <div className="board-under">
              <span
                className={`turn${sideToMove(fen) === "w" ? "" : " black"}`}
              >
                <span className="turn-dot" aria-hidden="true" />
                {sideToMove(fen) === "w"
                  ? t("training.whiteToMove")
                  : t("training.blackToMove")}
              </span>
              <div className="board-toolbar">
                <FlipBoardButton className="icon-btn" onClick={flip} />
                <button
                  className="btn icon-btn hint-icon"
                  type="button"
                  onClick={() => {
                    if (
                      isSubmitting ||
                      isAdvancing ||
                      !itemId ||
                      isSessionCompleted
                    )
                      return;
                    setHintLevel((h) => (h < 0 ? 0 : 1));
                  }}
                  disabled={busy || !itemId || isSessionCompleted}
                  aria-label={t("training.showHint")}
                  title={t("training.showHint")}
                >
                  💡
                </button>
              </div>
            </div>
          </div>

          <aside className="train-rail">
            <div className="rail-head">
              <div className="rail-eyebrow">{t("training.eyebrow")}</div>
              <div className="rail-title">
                <h1>{openingName}</h1>
                {eco && <span className="eco-chip">{eco}</span>}
              </div>
            </div>

            <div className={`train-status ${statusKind}`} role="status">
              <span className="train-status-ic" aria-hidden="true">
                {statusIcon}
              </span>
              <div>
                <div className="train-status-msg">{statusMsg}</div>
                {statusSub && (
                  <div className="train-status-sub">{statusSub}</div>
                )}
              </div>
            </div>

            {isSessionCompleted ? (
              <div className="train-controls">
                <button
                  className="btn primary"
                  type="button"
                  onClick={trainAgain}
                  disabled={isRestarting}
                >
                  {isRestarting
                    ? t("training.restarting")
                    : t("training.trainAgain")}
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => navigate("/dashboard")}
                >
                  {t("training.chooseAnother")}
                </button>
              </div>
            ) : (
              <div className="train-controls">
                <div className="train-stepper">
                  <button
                    className="btn"
                    type="button"
                    onClick={() => jumpToIndex(timeline.index - 1)}
                    disabled={busy || timeline.index <= 0}
                  >
                    {t("training.prev")}
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => jumpToIndex(timeline.index + 1)}
                    disabled={
                      busy || timeline.index >= timeline.fens.length - 1
                    }
                  >
                    {t("training.next")}
                  </button>
                </div>

                <form className="train-type-move" onSubmit={handleSubmit}>
                  <input
                    className="text-input"
                    value={moveInput}
                    onChange={(e) => setMoveInput(e.target.value)}
                    placeholder={t("training.movePlaceholder")}
                    disabled={isSubmitting}
                  />
                  <button
                    className="btn primary"
                    type="submit"
                    disabled={busy || !moveInput.trim() || !atLatest}
                    title={!atLatest ? t("training.jumpToLatest") : undefined}
                  >
                    {t("training.play")}
                  </button>
                </form>
              </div>
            )}

            {!isSessionCompleted && (
              <button
                className="train-exit"
                type="button"
                onClick={() => navigate("/dashboard")}
              >
                {t("training.backToOpenings")}
              </button>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
};
