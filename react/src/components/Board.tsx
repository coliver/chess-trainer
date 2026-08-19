import { useEffect, useRef } from "react";
import { Chessboard, INPUT_EVENT_TYPE } from "cm-chessboard";
import { useChessSounds } from "../hooks/useChessSounds";

type BoardProps = {
  position: string;
  orientation: "white" | "black";
  onMove?: (from: string, to: string) => boolean;
  gameOver?: boolean;
  interactive?: boolean;
  animated?: boolean;
  showCoordinates?: boolean;
  markers?: any[];
  moveColor?: string;
  getLegalMoves?: (square: string) => any[];
  onMoveStart?: (square: string) => boolean;
};

export type BoardMarker = any; // Export for use in other components

export default function Board({
  position,
  orientation,
  onMove,
  gameOver = false,
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
    });

    boardRef.current = board;

    board.enableMoveInput((event: { type: string; squareFrom?: string; squareTo?: string }) => {
      switch (event.type) {
        case INPUT_EVENT_TYPE.moveStart:
          return true;

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

    return () => {
      board.destroy?.();
      boardRef.current = null;
    };
  }, [orientation, position, onMove, playSound]);

  useEffect(() => {
    if (gameOver) {
      playSound("game_complete_win");
    }
  }, [gameOver, playSound]);

  return <div id="board" style={{ width: "100%", height: "100%" }} />;
}