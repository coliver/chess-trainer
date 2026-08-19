import { useEffect, useRef } from "react";
import { Chessboard, INPUT_EVENT_TYPE } from "cm-chessboard";
import { useChessSounds } from "../hooks/useChessSounds";

type BoardMove = { to: string; promotion?: string };

type BoardProps = {
  position: string;
  orientation: "white" | "black";
  onMove?: (from: string, to: string) => boolean;
  gameOver?: boolean;
  interactive?: boolean;
  animated?: boolean;
  showCoordinates?: boolean;
  markers?: BoardMarker[];
  getLegalMoves?: (square: string) => BoardMove[];
  onMoveStart?: (square: string) => boolean;
};

export type BoardMarker = { square: string; type: string };

export default function Board({
  position,
  orientation,
  onMove,
  gameOver = false,
  interactive = false,
  animated: _animated = true,
  showCoordinates: _showCoordinates = true,
  markers = [],
  getLegalMoves,
  onMoveStart,
}: BoardProps) {
  const boardRef = useRef<Chessboard | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const lastMoveRef = useRef<{ from: string; to: string } | null>(null);
  const { playSound } = useChessSounds();

  useEffect(() => {
    const boardElement = hostRef.current;
    if (!boardElement) return;

    // If an instance already exists (fast remounts), destroy it first.
    boardRef.current?.destroy?.();

    const board = new Chessboard(
      boardElement,
      {
        position,
        orientation,
        responsive: true,
        assetsUrl: "/cm-chessboard-assets/",
        assetsCache: true,
        style: {
          cssClass: "default",
          showCoordinates: _showCoordinates,
          animationDuration: _animated ? 300 : 0,
        },
      } as unknown,
    );

    boardRef.current = board;

    const api = board as unknown as {
      addLegalMovesMarkers?: (moves: BoardMove[]) => void;
      addMarker?: (type: unknown, square: string) => void;
      removeLegalMovesMarkers?: () => void;
      getPiece?: (square: string) => string | null;
      destroy?: () => void;
      enableMoveInput?: (
        handler: (event: { type: string; squareFrom?: string; squareTo?: string }) => boolean | void,
        color?: unknown,
      ) => void;
    };

    if (api.enableMoveInput) {
      api.enableMoveInput((event) => {
        const evt = event as { type: string; squareFrom?: string; squareTo?: string };
        switch (evt.type) {
          case INPUT_EVENT_TYPE.moveStart: {
            const from = evt.squareFrom ?? "";
            if (onMoveStart && !onMoveStart(from)) {
              return false;
            }

            if (getLegalMoves) {
              const moves = getLegalMoves(from);
              api.addLegalMovesMarkers?.(moves);
            }
            return true;
          }

          case INPUT_EVENT_TYPE.validateMoveInput: {
            api.removeLegalMovesMarkers?.();

            const from = evt.squareFrom ?? "";
            const to = evt.squareTo ?? "";

            const movingPiece = api.getPiece?.(from) ?? "";
            const targetPiece = api.getPiece?.(to);

            const isCapture = !!targetPiece;
            const isCastle =
              movingPiece[1]?.toLowerCase() === "k" &&
              Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2;
            const isPromotion =
              movingPiece[1]?.toLowerCase() === "p" &&
              (to[1] === "1" || to[1] === "8");

            const accepted = onMove ? onMove(from, to) : false;

            if (accepted) {
              lastMoveRef.current = { from, to };

              if (isCastle) playSound("castle");
              else if (isPromotion) playSound("promote");
              else if (isCapture) playSound("capture");
              else playSound("move");
            }

            return accepted;
          }

          case INPUT_EVENT_TYPE.moveCanceled:
            api.removeLegalMovesMarkers?.();
            return true;

          default:
            return true;
        }
      });
    }

    // Apply markers (hints, last move, etc.)
    if (markers && markers.length > 0) {
      markers.forEach((marker) => {
        api.addMarker?.(marker.type, marker.square);
      });
    }

    return () => {
      api.destroy?.();
      boardRef.current = null;
    };
  }, [orientation, position, onMove, playSound, interactive, getLegalMoves, onMoveStart, markers, _showCoordinates, _animated]);

  useEffect(() => {
    if (gameOver) {
      playSound("game_complete_win");
    }
  }, [gameOver, playSound]);

  // Use a per-instance host and give it a square aspect so thumbnail previews
  // get a usable height even when their container only sets width.
  return <div ref={hostRef} style={{ width: "100%", aspectRatio: "1 / 1", minHeight: 120 }} />;
}
