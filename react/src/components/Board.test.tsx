// react/src/components/Board.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { PreferencesProvider } from "../context/PreferencesContext";
import Board from "./Board";

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

    enableMoveInput() {
      this.moveInputEnabled = true;
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

    removeLegalMovesMarkers() {}
    addLegalMovesMarkers() {}
    removeMarkers() {}
    addMarker() {}
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
});
