import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import Board, { type BoardMarker } from "../components/Board";
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

export const Training = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { blinkGreen, blinkSquare } = useBlinkGreen();
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
    takeAutoplayOnce,
    isSessionCompleted,
  } = useTrainingSession(id, handle401);

  const [moveInput, setMoveInput] = useState("");
  const [showAnimations] = useState(true);
  const { orientation, flip } = useBoardOrientation();
  const [hintLevel, setHintLevel] = useState(-1);
  const [localFeedback, setLocalFeedback] = useState("");
  const shownFeedback = localFeedback || feedback;

  const fenRef = useRef(fen);
  const lastSubmittedMoveUciRef = useRef<string>("");
  const isSubmittingRef = useRef(isSubmitting);
  const isAdvancingRef = useRef(isAdvancing);
  const lastAutoplayedItemIdRef = useRef<string | null>(null);
  const prevFeedbackRef = useRef<string>(feedback);
  const prevItemIdRef = useRef<string | null>(itemId);

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
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    isAdvancingRef.current = isAdvancing;
  }, [isAdvancing]);

  useEffect(() => {
    if (
      prevFeedbackRef.current !== "✅ Correct!" &&
      feedback === "✅ Correct!"
    ) {
      setHintLevel(-1);
    }
    prevFeedbackRef.current = feedback;
  }, [feedback]);

  useEffect(() => {
    if (feedback === "✅ Correct!" && lastSubmittedMoveUciRef.current) {
      blinkGreen(lastSubmittedMoveUciRef.current, 2);
    }
  }, [feedback, blinkGreen]);

  const isWhiteToMove = useMemo(() => sideToMove(fen) === "w", [fen]);
  const atLatest = isAtLatest(timeline);

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
  }, []);

  // Reset per-item UI state when advancing to a new training item, without
  // remounting the board (a remount here would flash/reload cm-chessboard).
  useEffect(() => {
    if (prevItemIdRef.current !== itemId) {
      setLocalFeedback("");
      setMoveInput("");
      setHintLevel(-1);
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
    if (sideToMove(fenRef.current) !== "b") {
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
    }
    // Opponent's reply, not the player's turn — don't show the "Correct!" banner for it.
    void submitMove(uci, fenRef.current, { silent: true });
  }, [
    id,
    itemId,
    fen,
    correctMoveUci,
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
    await submitMove(uci, fenRef.current);
    setMoveInput("");
  };

  const processMove = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      if (isSubmittingRef.current || isAdvancingRef.current || !itemId)
        return false;

      if (!sourceSquare || !targetSquare) return false;

      // ✅ prevent chess.js from being called with from===to
      if (sourceSquare === targetSquare) return false;

      const result = applyMove(
        fenRef.current,
        sourceSquare,
        targetSquare,
        correctMoveUci,
      );
      if (!result) {
        setLocalFeedback("❌ Illegal move");
        return false;
      }

      setFen(result.nextFen);
      appendTimelineFen(result.nextFen);

      setLocalFeedback("");
      lastSubmittedMoveUciRef.current = result.uci;
      setMoveInput(result.uci);
      void submitMove(result.uci, fenRef.current);

      return true;
    },
    [
      appendTimelineFen,
      correctMoveUci,
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
      if (isSubmittingRef.current || isAdvancingRef.current || !itemId)
        return false;
      if (!isWhiteToMove) return false;
      return pieceColorAt(fenRef.current, square) === "w";
    },
    [atLatest, itemId, isWhiteToMove],
  );

  // Legal targets for the picked-up piece — rendered as dots by cm-chessboard.
  const getLegalMoves = useCallback(
    (square: string): { to: string; promotion?: string }[] =>
      legalMoves(fenRef.current, square),
    [],
  );

  // Persistent highlights: hint (from, then from+to) and correct-move blink.
  const markers = useMemo((): BoardMarker[] => {
    const arr: BoardMarker[] = [];

    const hint = deriveHintMarkers(correctMoveUci, hintLevel, isSessionCompleted);
    if (hint) {
      arr.push({ square: hint.from, type: "hint" });
      if (hint.to) arr.push({ square: hint.to, type: "hint" });
    }

    if (blinkSquare) arr.push({ square: blinkSquare, type: "blink" });

    return arr;
  }, [correctMoveUci, hintLevel, blinkSquare, isSessionCompleted]);

  // Split "C50 Italian Game" into an ECO chip + name for the rail header.
  const { eco, openingName } = splitOpeningLabel(openingLabel);

  // Derive the status banner from the existing feedback / turn / hint state.
  const status = deriveStatus({
    isSessionCompleted,
    feedback: shownFeedback,
    hintLevel,
    isWhiteToMove,
  });
  const { kind: statusKind, icon: statusIcon, message: statusMsg, sub: statusSub } = status;

  const busy = isSubmitting || isAdvancing;

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
                animated={showAnimations}
                moveColor="white"
                markers={markers}
                getLegalMoves={getLegalMoves}
                onMoveStart={canPickUp}
                onMove={onMove}
              />
            </div>
            <div className="board-under">
              <span className={`turn${isWhiteToMove ? "" : " black"}`}>
                <span className="turn-dot" aria-hidden="true" />
                {isWhiteToMove ? "White to move" : "Black to move"}
              </span>
              <div className="board-toolbar">
                <FlipBoardButton className="icon-btn" onClick={flip} />
                <button
                  className="btn icon-btn hint-icon"
                  type="button"
                  onClick={() => {
                    if (
                      isSubmittingRef.current ||
                      isAdvancingRef.current ||
                      !itemId ||
                      isSessionCompleted
                    )
                      return;
                    setHintLevel((h) => (h < 0 ? 0 : 1));
                  }}
                  disabled={busy || !itemId || isSessionCompleted}
                  aria-label="Show a hint"
                  title="Show a hint"
                >
                  💡
                </button>
              </div>
            </div>
          </div>

          <aside className="train-rail">
            <div className="rail-head">
              <div className="rail-eyebrow">Training</div>
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

            <div className="train-controls">
              <div className="train-stepper">
                <button
                  className="btn"
                  type="button"
                  onClick={() => jumpToIndex(timeline.index - 1)}
                  disabled={busy || timeline.index <= 0}
                >
                  ‹ Prev
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => jumpToIndex(timeline.index + 1)}
                  disabled={busy || timeline.index >= timeline.fens.length - 1}
                >
                  Next ›
                </button>
              </div>

              <form className="train-type-move" onSubmit={handleSubmit}>
                <input
                  className="text-input"
                  value={moveInput}
                  onChange={(e) => setMoveInput(e.target.value)}
                  placeholder="or type a move, e.g. e2e4"
                  disabled={isSubmitting}
                />
                <button
                  className="btn primary"
                  type="submit"
                  disabled={busy || !moveInput.trim() || !atLatest}
                  title={!atLatest ? "Jump to latest before submitting" : undefined}
                >
                  Play
                </button>
              </form>
            </div>

            <button
              className="train-exit"
              type="button"
              onClick={() => navigate("/dashboard")}
            >
              ← Back to openings
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
};
