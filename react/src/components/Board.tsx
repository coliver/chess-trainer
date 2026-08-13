import { useEffect, useRef } from "react";
import {
  Chessboard,
  COLOR,
  INPUT_EVENT_TYPE,
  BORDER_TYPE,
  type MoveInputEvent,
} from "cm-chessboard/src/Chessboard.js";
import {
  Markers,
  MARKER_TYPE,
} from "cm-chessboard/src/extensions/markers/Markers.js";
import "cm-chessboard/assets/chessboard.css";
import "cm-chessboard/assets/extensions/markers/markers.css";
import "../styles/board.css";

// Sprites are served from react/public (copied from the cm-chessboard package).
const ASSETS_URL = "/cm-chessboard-assets/";

export type BoardMarkerKind = "hint" | "blink";
export type BoardMarker = { square: string; type: BoardMarkerKind };

// Custom marker types (defined in styles/board.css). Kept as stable object
// references so removeMarkers(type) matches them by identity.
const CUSTOM_MARKER = {
  hint: { class: "marker-square-hint", slice: "markerSquare" },
  blink: { class: "marker-square-blink", slice: "markerSquare" },
} as const;

export type BoardProps = {
  /** Full FEN of the position to display. */
  position: string;
  orientation?: "white" | "black";
  /** Enable user move input (drag + click). Off = view-only preview. */
  interactive?: boolean;
  animated?: boolean;
  showCoordinates?: boolean;
  /** Which side the user is allowed to move. */
  moveColor?: "white" | "black";
  /** Persistent highlights (hints, correct-move blink). */
  markers?: BoardMarker[];
  /** Legal targets for the square being picked up (shows dots). */
  getLegalMoves?: (square: string) => { to: string; promotion?: string }[];
  /** Return false to block picking up a piece on `square`. */
  onMoveStart?: (square: string) => boolean;
  /** Return true to accept the move, false to snap the piece back. */
  onMove?: (from: string, to: string) => boolean;
};

export default function Board({
  position,
  orientation = "white",
  interactive = false,
  animated = true,
  showCoordinates = true,
  moveColor = "white",
  markers,
  getLegalMoves,
  onMoveStart,
  onMove,
}: BoardProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<Chessboard | null>(null);

  // Keep the latest callbacks reachable from the single move-input handler,
  // which is registered once per interactive session.
  const cbRef = useRef({ getLegalMoves, onMoveStart, onMove });
  useEffect(() => {
    cbRef.current = { getLegalMoves, onMoveStart, onMove };
  });

  // Create the board once. Prop changes are applied by the effects below.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const board = new Chessboard(el, {
      position,
      orientation: orientation === "black" ? COLOR.black : COLOR.white,
      responsive: true,
      assetsUrl: ASSETS_URL,
      style: {
        cssClass: "default",
        showCoordinates,
        borderType: BORDER_TYPE.none,
        animationDuration: animated ? 300 : 0,
      },
      extensions: [{ class: Markers, props: { autoMarkers: MARKER_TYPE.frame } }],
    });
    boardRef.current = board;

    return () => {
      board.destroy();
      boardRef.current = null;
    };
    // Intentionally created once; see per-prop effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Orientation (white/black at bottom).
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const desired = orientation === "black" ? COLOR.black : COLOR.white;
    if (board.getOrientation() !== desired) {
      void board.setOrientation(desired, false);
    }
  }, [orientation]);

  // Position: only re-set when the piece placement actually changes, so an
  // accepted user move (already reflected on the board) does not re-animate.
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const desired = position.split(" ")[0];
    const current = board.getPosition()?.split(" ")[0];
    if (desired !== current) void board.setPosition(position, animated);
  }, [position, animated]);

  // Enable/disable move input and register the handler.
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    if (!interactive) {
      board.disableMoveInput();
      return;
    }

    const handler = (event: MoveInputEvent): boolean | void => {
      const cb = cbRef.current;
      switch (event.type) {
        case INPUT_EVENT_TYPE.moveInputStarted: {
          const from = event.squareFrom ?? "";
          const allowed = cb.onMoveStart ? cb.onMoveStart(from) : true;
          if (allowed && cb.getLegalMoves) {
            board.removeLegalMovesMarkers();
            board.addLegalMovesMarkers(cb.getLegalMoves(from));
          }
          return allowed;
        }
        case INPUT_EVENT_TYPE.validateMoveInput: {
          board.removeLegalMovesMarkers();
          const to = event.squareTo ?? "";
          // Landing on a friendly piece is a re-selection, not a move attempt
          // (cm-chessboard makes it the new selection when we return false).
          // Skip onMove so callers don't flash illegal-move feedback.
          const ownPrefix = moveColor === "black" ? "b" : "w";
          if (board.getPiece(to)?.startsWith(ownPrefix)) return false;
          return cb.onMove ? cb.onMove(event.squareFrom ?? "", to) : false;
        }
        case INPUT_EVENT_TYPE.moveInputCanceled:
        case INPUT_EVENT_TYPE.moveInputFinished: {
          board.removeLegalMovesMarkers();
          return;
        }
        default:
          return;
      }
    };

    board.enableMoveInput(
      handler,
      moveColor === "black" ? COLOR.black : COLOR.white,
    );
    // Only disable if the board still exists; when the component unmounts the
    // creation effect's cleanup may have already destroyed it.
    return () => {
      if (boardRef.current) board.disableMoveInput();
    };
  }, [interactive, moveColor]);

  // Persistent hint/blink markers. This layer owns only the custom marker
  // types, so it never disturbs the auto (selection) frame or legal-move dots.
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    board.removeMarkers(CUSTOM_MARKER.hint);
    board.removeMarkers(CUSTOM_MARKER.blink);
    for (const m of markers ?? []) {
      board.addMarker(CUSTOM_MARKER[m.type], m.square);
    }
  }, [markers]);

  return <div ref={hostRef} className="board-host" />;
}
