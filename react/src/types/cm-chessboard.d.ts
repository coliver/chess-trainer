declare module "cm-chessboard" {
  export const INPUT_EVENT_TYPE: {
    moveStart: string;
    validateMoveInput: string;
    moveCanceled: string;
    [key: string]: string;
  };

  export type MoveInputEvent = {
    type: string;
    squareFrom?: string;
    squareTo?: string;
  };

  export class Chessboard {
    constructor(element: Element | HTMLElement, options?: any);
    enableMoveInput(cb: (event: MoveInputEvent) => boolean | void): void;
    removeLegalMovesMarkers(): void;
    getPiece(square: string): string | null;
    destroy?(): void;
    // Minimal API surface we use — leave room for any other methods
    [key: string]: any;
  }

  export default Chessboard;
}
