// src/tests/Training.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, act, screen } from "@testing-library/react";

let onPieceDrop: any;
let allowDragging: any;

const moveMock = vi.fn();
const fenMock = vi.fn().mockReturnValue("after-fen");
const turnMock = vi.fn().mockReturnValue("w");

vi.mock("chess.js", () => ({
  Chess: vi.fn().mockImplementation(function ChessMock() {
    (this as any).move = moveMock;
    (this as any).fen = fenMock;
    (this as any).turn = turnMock;
  }),
}));

vi.mock("react-chessboard", () => ({
  Chessboard: (props: any) => {
    onPieceDrop = props?.options?.onPieceDrop;
    allowDragging = props?.options?.allowDragging;
    return <div data-testid="chessboard" />;
  },
}));

vi.mock("../api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "sess-1" }),
  useNavigate: () => vi.fn(),
}));

vi.mock("../components/StartNewTrainingButton", () => ({
  StartNewTrainingButton: (p: any) => <button {...p} />,
}));

vi.mock("../components/FenTurnBadge", () => ({
  default: ({ fen }: any) => <div data-testid="fen-badge">{fen}</div>,
}));

import api from "../api";
import { Training } from "../pages/Training";

describe("Training handlePieceDrop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onPieceDrop = undefined;

    moveMock.mockReset();
    moveMock.mockReturnValue(null);

    fenMock.mockReturnValue("after-fen");
    turnMock.mockReturnValue("w");

    (api.get as any).mockResolvedValue({
      data: {
        fen_after: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        item_id: "item-123",
        opening_name: "Test",
        opening_eco: "E00",
        correct_move_uci: "", // prevent auto-play
        pgn: "",
        epd: "",
      },
    });
  });

  it("returns true and sets uci + submits move on legal move", async () => {
    moveMock.mockReturnValue({ promotion: "q" });

    (api.post as any).mockResolvedValue({
      data: { correct: false, reason: "bad move" },
    });

    render(<Training />);

    await waitFor(() => expect(onPieceDrop).toBeTypeOf("function"));

    act(() => {
      const ok = onPieceDrop("e2", "e4");
      expect(ok).toBe(true);
    });

    const expectedUci = "e2e4q";
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/training-sessions/sess-1/responses",
        { move_uci: expectedUci, item_id: "item-123" },
      ),
    );

    expect(
      (screen.getByPlaceholderText("e.g. e2e4") as HTMLInputElement).value,
    ).toBe(expectedUci);
  });

  it("sets illegal-move feedback and returns false when chess.js move() returns null", async () => {
    moveMock.mockReturnValue(null);
    (api.post as any).mockResolvedValue({ data: {} });

    render(<Training />);

    await waitFor(() => expect(onPieceDrop).toBeTypeOf("function"));
    await waitFor(() => expect(allowDragging).toBe(true)); // <-- key change

    act(() => {
      const ok = onPieceDrop("e2", "e4");
      expect(ok).toBe(false);
    });

    expect(await screen.findByText("❌ Illegal move")).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
  });
});
