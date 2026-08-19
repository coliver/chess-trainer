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
  moveColor?: string;
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
  animated = true,
  showCoordinates = true,
  markers = [],
  moveColor,
  getLegalMoves,
  onMoveStart,
}: BoardProps) {
  const boardRef = useRef<Chessboard | null>(null);
  const lastMoveRef = useRef<{ from: string; to: string } | null>(null);
  const { playSound } = useChessSounds();

  useEffect(() => {
    const boardElement = document.getElementById("board");
    if (!boardElement) return;

    const board = new Chessboard(boardElement, {
      position,
      orientation,
      style: {
        cssClass: "default",
      },
    } as any);

    boardRef.current = board;

    if (interactive) {
      board.enableMoveInput((event: { type: string; squareFrom?: string; squareTo?: string }) => {
        switch (event.type) {
          case INPUT_EVENT_TYPE.moveStart: {
            const from = event.squareFrom ?? "";
            // Check if this piece can be moved
            if (onMoveStart && !onMoveStart(from)) {
              return false;
            }

            // Show legal moves if getLegalMoves is provided
            if (getLegalMoves) {
              const moves = getLegalMoves(from);
              moves.forEach((move) => {
                (board as any).addMarker(move.to, "legal");
              });
            }
            return true;
          }

          case INPUT_EVENT_TYPE.validateMoveInput: {
            board.removeLegalMovesMarkers();

            const from = event.squareFrom ?? "";
            const to = event.squareTo ?? "";

            const movingPiece = board.getPiece(from) ?? "";
            const targetPiece = board.getPiece(to);

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
            board.removeLegalMovesMarkers();
            return true;

          default:
            return true;
        }
      });
    }

    // Apply markers (hints, last move, etc.)
    if (markers && markers.length > 0) {
      markers.forEach((marker) => {
        (board as any).addMarker(marker.square, marker.type);
      });
    }

    return () => {
      board.destroy?.();
      boardRef.current = null;
    };
  }, [orientation, position, onMove, playSound, interactive, getLegalMoves, onMoveStart, markers]);

  useEffect(() => {
    if (gameOver) {
      playSound("game_complete_win");
    }
  }, [gameOver, playSound]);

  return <div id="board" style={{ width: "100%", height: "100%" }} />;
}
