// react/src/components/Board.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { PreferencesProvider } from "../context/PreferencesContext";
import Board from "./Board";
import { INPUT_EVENT_TYPE } from "cm-chessboard/src/Chessboard.js";

// Fake cm-chessboard: records every instance so tests can assert on
// construction/destruction and move-input (de)registration without a real
// DOM/SVG board (cm-chessboard needs real layout, which jsdom can't give it).
// Defined inside vi.hoisted since vi.mock factories are hoisted above
// regular top-level declarations.
const { FakeChessboard } = vi.hoisted(() => {
  class FakeChessboard {
    static instances: FakeChessboard[] = [];
    destroyed = false;
    moveInputEnabled = false;
    moveInputHandler: ((event: unknown) => boolean | void) | null = null;
    moveInputColor: string | null = null;
    position: string;
    orientation: string;

    constructor(_el: unknown, config: { position: string; orientation: string }) {
      this.position = config.position;
      this.orientation = config.orientation;
      FakeChessboard.instances.push(this);
    }

    destroy() {
      this.destroyed = true;
    }

    enableMoveInput(handler: (event: unknown) => boolean | void, color: string) {
      this.moveInputEnabled = true;
      this.moveInputHandler = handler;
      this.moveInputColor = color;
    }

    disableMoveInput() {
      if (this.destroyed) {
        throw new Error("disableMoveInput called on an already-destroyed board");
      }
      this.moveInputEnabled = false;
    }

    getPosition() {
      return this.position;
    }

    async setPosition(fen: string) {
      this.position = fen;
    }

    getOrientation() {
      return this.orientation;
    }

    async setOrientation(orientation: string) {
      this.orientation = orientation;
    }

    getPiece() {
      return undefined;
    }

    markerCalls: unknown[] = [];
    arrowCalls: unknown[] = [];

    removeLegalMovesMarkers = vi.fn();
    addLegalMovesMarkers = vi.fn();

    removeMarkers() {
      this.markerCalls.push({ op: "remove" });
    }

    addMarker(type: unknown, square: string) {
      this.markerCalls.push({ op: "add", type, square });
    }

    removeArrows() {
      this.arrowCalls.push({ op: "remove" });
    }

    addArrow(type: unknown, from: string, to: string) {
      this.arrowCalls.push({ op: "add", type, from, to });
    }
  }

  return { FakeChessboard };
});

vi.mock("cm-chessboard/src/Chessboard.js", () => ({
  Chessboard: FakeChessboard,
  COLOR: { white: "w", black: "b" },
  INPUT_EVENT_TYPE: {
    moveInputStarted: "moveInputStarted",
    validateMoveInput: "validateMoveInput",
    moveInputCanceled: "moveInputCanceled",
    moveInputFinished: "moveInputFinished",
  },
  BORDER_TYPE: { none: "none" },
}));

vi.mock("cm-chessboard/src/extensions/markers/Markers.js", () => ({
  Markers: class {},
  MARKER_TYPE: { frame: "frame" },
}));

vi.mock("cm-chessboard/src/extensions/accessibility/Accessibility.js", () => ({
  Accessibility: class {},
}));

vi.mock("cm-chessboard/src/extensions/arrows/Arrows.js", () => ({
  Arrows: class {},
  ARROW_TYPE: {
    default: { class: "arrow-success" },
    success: { class: "arrow-success" },
    secondary: { class: "arrow-secondary" },
    warning: { class: "arrow-warning" },
    info: { class: "arrow-info" },
    danger: { class: "arrow-danger" },
  },
}));

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const renderBoard = (props: Partial<React.ComponentProps<typeof Board>> = {}) =>
  render(
    <PreferencesProvider>
      <Board position={START_FEN} interactive onMove={() => true} {...props} />
    </PreferencesProvider>,
  );

describe("Board", () => {
  it("registers move input on mount", () => {
    FakeChessboard.instances.length = 0;
    renderBoard();

    expect(FakeChessboard.instances).toHaveLength(1);
    expect(FakeChessboard.instances[0].moveInputEnabled).toBe(true);
  });

  it("re-registers move input on the new instance when the board is recreated by a style prop change", () => {
    FakeChessboard.instances.length = 0;
    const { rerender } = renderBoard({ animated: false });

    expect(FakeChessboard.instances).toHaveLength(1);
    expect(FakeChessboard.instances[0].moveInputEnabled).toBe(true);

    // `animated` is a style prop baked into the cm-chessboard constructor
    // config, so changing it destroys and recreates the underlying board.
    rerender(
      <PreferencesProvider>
        <Board position={START_FEN} interactive onMove={() => true} animated />
      </PreferencesProvider>,
    );

    expect(FakeChessboard.instances).toHaveLength(2);
    const [old, current] = FakeChessboard.instances;
    expect(old.destroyed).toBe(true);
    // Regression: the new board instance must get its own move-input
    // handler; previously only the constructor-only effect re-ran and the
    // move-input effect's deps didn't include the board's identity, leaving
    // the recreated board permanently non-interactive.
    expect(current.moveInputEnabled).toBe(true);
  });

  it("does not throw when the board is recreated (stale disableMoveInput on an already-destroyed instance)", () => {
    FakeChessboard.instances.length = 0;
    const { rerender } = renderBoard({ animated: false });

    expect(() =>
      rerender(
        <PreferencesProvider>
          <Board position={START_FEN} interactive onMove={() => true} animated />
        </PreferencesProvider>,
      ),
    ).not.toThrow();
  });

  // The markers/arrows sync effects can legitimately re-run more than once
  // per prop change (e.g. while PreferencesContext hydrates), same as the
  // move-input effect above, so these assert on the final state (the last
  // remove+add pair) rather than an exact call count.
  it("syncs the arrows prop to addArrow/removeArrows calls", () => {
    FakeChessboard.instances.length = 0;
    const { rerender } = renderBoard({
      arrows: [{ from: "e2", to: "e4" }],
    });

    const board = FakeChessboard.instances[0];
    expect(board.arrowCalls.at(-1)).toEqual({
      op: "add",
      type: { class: "arrow-success" },
      from: "e2",
      to: "e4",
    });
    expect(board.arrowCalls.at(-2)).toEqual({ op: "remove" });

    board.arrowCalls = [];
    rerender(
      <PreferencesProvider>
        <Board
          position={START_FEN}
          interactive
          onMove={() => true}
          arrows={[{ from: "d2", to: "d4", type: "danger" }]}
        />
      </PreferencesProvider>,
    );

    expect(board.arrowCalls.at(-1)).toEqual({
      op: "add",
      type: { class: "arrow-danger" },
      from: "d2",
      to: "d4",
    });
    expect(board.arrowCalls.at(-2)).toEqual({ op: "remove" });

    board.arrowCalls = [];
    rerender(
      <PreferencesProvider>
        <Board position={START_FEN} interactive onMove={() => true} />
      </PreferencesProvider>,
    );

    expect(board.arrowCalls).toEqual([{ op: "remove" }]);
  });

  it("syncs the markers prop to addMarker/removeMarkers calls", () => {
    FakeChessboard.instances.length = 0;
    renderBoard({ markers: [{ square: "e4", type: "hint" }] });

    const board = FakeChessboard.instances[0];
    expect(board.markerCalls.at(-1)).toEqual({
      op: "add",
      type: { class: "marker-square-hint", slice: "markerSquare" },
      square: "e4",
    });
    expect(board.markerCalls.slice(-4, -1)).toEqual([
      { op: "remove" },
      { op: "remove" },
      { op: "remove" },
    ]);
  });

  it("disables move input and never registers a handler when interactive is false", () => {
    FakeChessboard.instances.length = 0;
    renderBoard({ interactive: false });

    const board = FakeChessboard.instances[0];
    expect(board.moveInputEnabled).toBe(false);
    expect(board.moveInputHandler).toBeNull();
  });

  it("keeps keyboard-capable latched on once interactive turns on, and does not revert it when interactive turns off again", () => {
    FakeChessboard.instances.length = 0;
    const { rerender } = renderBoard({ interactive: false });
    expect(FakeChessboard.instances[0].moveInputEnabled).toBe(false);

    // false -> true is also a style-prop (keyboardCapable) change, so the board
    // is recreated; the new instance should have move input enabled.
    rerender(
      <PreferencesProvider>
        <Board position={START_FEN} interactive onMove={() => true} />
      </PreferencesProvider>,
    );
    expect(FakeChessboard.instances).toHaveLength(2);
    const board = FakeChessboard.instances[1];
    expect(board.moveInputEnabled).toBe(true);

    // true -> false does not un-latch keyboardCapable, so no rebuild happens;
    // the same instance just gets its move input disabled.
    rerender(
      <PreferencesProvider>
        <Board position={START_FEN} interactive={false} onMove={() => true} />
      </PreferencesProvider>,
    );
    expect(FakeChessboard.instances).toHaveLength(2);
    expect(board.moveInputEnabled).toBe(false);
  });

  it("passes a black orientation through to the initial board config", () => {
    FakeChessboard.instances.length = 0;
    renderBoard({ orientation: "black" });

    expect(FakeChessboard.instances[0].orientation).toBe("b");
  });

  it("calls setOrientation only when the orientation prop changes to a different value", () => {
    FakeChessboard.instances.length = 0;
    const { rerender } = renderBoard({ orientation: "white" });
    const board = FakeChessboard.instances[0];
    const setOrientationSpy = vi.spyOn(board, "setOrientation");

    // Same orientation re-render: no-op.
    rerender(
      <PreferencesProvider>
        <Board position={START_FEN} interactive onMove={() => true} orientation="white" />
      </PreferencesProvider>,
    );
    expect(setOrientationSpy).not.toHaveBeenCalled();

    rerender(
      <PreferencesProvider>
        <Board position={START_FEN} interactive onMove={() => true} orientation="black" />
      </PreferencesProvider>,
    );
    expect(setOrientationSpy).toHaveBeenCalledWith("b", expect.anything());
  });

  it("calls setPosition only when the position prop changes to a different placement", () => {
    FakeChessboard.instances.length = 0;
    const { rerender } = renderBoard();
    const board = FakeChessboard.instances[0];
    const setPositionSpy = vi.spyOn(board, "setPosition");
    const ADVANCED_FEN =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

    // Same position re-render: no-op.
    rerender(
      <PreferencesProvider>
        <Board position={START_FEN} interactive onMove={() => true} />
      </PreferencesProvider>,
    );
    expect(setPositionSpy).not.toHaveBeenCalled();

    rerender(
      <PreferencesProvider>
        <Board position={ADVANCED_FEN} interactive onMove={() => true} />
      </PreferencesProvider>,
    );
    expect(setPositionSpy).toHaveBeenCalledWith(ADVANCED_FEN, expect.anything());
  });

  describe("move-input handler", () => {
    it("moveInputStarted: a blocking onMoveStart prevents legal-move markers from being shown", () => {
      FakeChessboard.instances.length = 0;
      const onMoveStart = vi.fn().mockReturnValue(false);
      const getLegalMoves = vi.fn().mockReturnValue([]);
      renderBoard({ onMoveStart, getLegalMoves });

      const board = FakeChessboard.instances[0];
      const result = board.moveInputHandler!({
        type: INPUT_EVENT_TYPE.moveInputStarted,
        squareFrom: "e2",
      });

      expect(onMoveStart).toHaveBeenCalledWith("e2");
      expect(result).toBe(false);
      expect(getLegalMoves).not.toHaveBeenCalled();
      expect(board.addLegalMovesMarkers).not.toHaveBeenCalled();
    });

    it("moveInputStarted: defaults to allowed and shows legal moves when onMoveStart is not provided", () => {
      FakeChessboard.instances.length = 0;
      const getLegalMoves = vi.fn().mockReturnValue([{ to: "e4" }]);
      renderBoard({ getLegalMoves });

      const board = FakeChessboard.instances[0];
      // No squareFrom on the event: exercises the `?? ""` fallback.
      const result = board.moveInputHandler!({
        type: INPUT_EVENT_TYPE.moveInputStarted,
      });

      expect(result).toBe(true);
      expect(getLegalMoves).toHaveBeenCalledWith("");
      expect(board.removeLegalMovesMarkers).toHaveBeenCalled();
      expect(board.addLegalMovesMarkers).toHaveBeenCalledWith([{ to: "e4" }]);
    });

    it("moveInputStarted: does not query legal moves when getLegalMoves is not provided", () => {
      FakeChessboard.instances.length = 0;
      const onMoveStart = vi.fn().mockReturnValue(true);
      renderBoard({ onMoveStart });

      const board = FakeChessboard.instances[0];
      const result = board.moveInputHandler!({
        type: INPUT_EVENT_TYPE.moveInputStarted,
        squareFrom: "g1",
      });

      expect(result).toBe(true);
      expect(board.addLegalMovesMarkers).not.toHaveBeenCalled();
    });

    it("validateMoveInput: landing on a friendly (white) piece is treated as a re-selection, not a move", () => {
      FakeChessboard.instances.length = 0;
      const onMove = vi.fn();
      renderBoard({ onMove });
      const board = FakeChessboard.instances[0];
      board.getPiece = () => "wN";

      const result = board.moveInputHandler!({
        type: INPUT_EVENT_TYPE.validateMoveInput,
        squareFrom: "b1",
        squareTo: "d2",
      });

      expect(result).toBe(false);
      expect(onMove).not.toHaveBeenCalled();
      expect(board.removeLegalMovesMarkers).toHaveBeenCalled();
    });

    it("validateMoveInput: landing on a friendly (black) piece uses the black own-piece prefix", () => {
      FakeChessboard.instances.length = 0;
      const onMove = vi.fn();
      renderBoard({ onMove, moveColor: "black" });
      const board = FakeChessboard.instances[0];
      board.getPiece = () => "bQ";

      const result = board.moveInputHandler!({
        type: INPUT_EVENT_TYPE.validateMoveInput,
        squareFrom: "d8",
        squareTo: "d7",
      });

      expect(result).toBe(false);
      expect(onMove).not.toHaveBeenCalled();
      expect(board.moveInputColor).toBe("b");
    });

    it("validateMoveInput: calls onMove and returns its result for a normal move", () => {
      FakeChessboard.instances.length = 0;
      const onMove = vi.fn().mockReturnValue(true);
      renderBoard({ onMove });
      const board = FakeChessboard.instances[0];
      board.getPiece = () => undefined;

      // No squareFrom/squareTo on the event: exercises both `?? ""` fallbacks.
      const result = board.moveInputHandler!({
        type: INPUT_EVENT_TYPE.validateMoveInput,
      });

      expect(onMove).toHaveBeenCalledWith("", "");
      expect(result).toBe(true);
    });

    it("validateMoveInput: returns false when onMove is not provided", () => {
      FakeChessboard.instances.length = 0;
      renderBoard({ onMove: undefined });
      const board = FakeChessboard.instances[0];
      board.getPiece = () => undefined;

      const result = board.moveInputHandler!({
        type: INPUT_EVENT_TYPE.validateMoveInput,
        squareFrom: "e7",
        squareTo: "e5",
      });

      expect(result).toBe(false);
    });

    it("moveInputCanceled and moveInputFinished clear legal-move markers and return nothing", () => {
      FakeChessboard.instances.length = 0;
      renderBoard();
      const board = FakeChessboard.instances[0];

      expect(
        board.moveInputHandler!({ type: INPUT_EVENT_TYPE.moveInputCanceled }),
      ).toBeUndefined();
      expect(
        board.moveInputHandler!({ type: INPUT_EVENT_TYPE.moveInputFinished }),
      ).toBeUndefined();
      expect(board.removeLegalMovesMarkers).toHaveBeenCalledTimes(2);
    });

    it("returns nothing for an unrecognized event type", () => {
      FakeChessboard.instances.length = 0;
      renderBoard();
      const board = FakeChessboard.instances[0];

      expect(
        board.moveInputHandler!({ type: "somethingElse" }),
      ).toBeUndefined();
    });
  });
});
