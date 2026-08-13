// Minimal ambient types for cm-chessboard (the package ships no .d.ts).
// Mirrors react/src/cm-chessboard.d.ts — only the surface used by the Angular
// BoardComponent is declared.

declare module 'cm-chessboard/src/Chessboard.js' {
  export const COLOR: { white: 'w'; black: 'b' };

  export const INPUT_EVENT_TYPE: {
    moveInputStarted: 'moveInputStarted';
    movingOverSquare: 'movingOverSquare';
    validateMoveInput: 'validateMoveInput';
    moveInputCanceled: 'moveInputCanceled';
    moveInputFinished: 'moveInputFinished';
  };

  export const BORDER_TYPE: { none: 'none'; thin: 'thin'; frame: 'frame' };
  export const FEN: { start: string; empty: string };

  export interface MoveInputEvent {
    chessboard: Chessboard;
    type: string;
    squareFrom?: string;
    squareTo?: string;
    square?: string;
    piece?: string | null;
    legalMove?: boolean;
    reason?: string;
  }

  export interface ChessboardProps {
    position?: string;
    orientation?: string;
    responsive?: boolean;
    assetsUrl?: string;
    assetsCache?: boolean;
    style?: {
      cssClass?: string;
      showCoordinates?: boolean;
      borderType?: string;
      aspectRatio?: number;
      pieces?: { type?: string; file?: string; tileSize?: number };
      animationDuration?: number;
    };
    extensions?: { class: unknown; props?: Record<string, unknown> }[];
  }

  export class Chessboard {
    constructor(context: HTMLElement, props?: ChessboardProps);
    setPosition(fen: string, animated?: boolean): Promise<void>;
    getPosition(): string;
    setOrientation(color: string, animated?: boolean): Promise<void>;
    getOrientation(): string;
    movePiece(from: string, to: string, animated?: boolean): Promise<void>;
    getPiece(square: string): string | null;
    enableMoveInput(
      handler: (event: MoveInputEvent) => boolean | void,
      color?: string,
    ): void;
    disableMoveInput(): void;
    // Methods added at runtime by the Markers extension:
    addMarker(type: unknown, square: string): void;
    removeMarkers(type?: unknown, square?: string): void;
    getMarkers(type?: unknown, square?: string): unknown[];
    addLegalMovesMarkers(moves: { to: string; promotion?: string }[]): void;
    removeLegalMovesMarkers(): void;
    destroy(): void;
  }
}

declare module 'cm-chessboard/src/extensions/markers/Markers.js' {
  export const MARKER_TYPE: Record<
    string,
    { class: string; slice: string; position?: string }
  >;
  export class Markers {}
}
