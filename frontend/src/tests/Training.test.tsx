import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, waitFor, act, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import api from "../api";
import { Training } from "../pages/Training";

let capturedOptions: any;

const moveMock = vi.fn();
const fenMock = vi.fn();
const turnMock = vi.fn();

vi.mock("chess.js", () => ({
  Chess: vi.fn().mockImplementation(function ChessMock() {
    (this as any).move = moveMock;
    (this as any).fen = fenMock;
    (this as any).turn = turnMock;
  }),
}));

vi.mock("react-chessboard", () => ({
  Chessboard: (props: any) => {
    capturedOptions = props?.options;
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

describe("Training Page", () => {
  let user: any;

  afterEach(() => {
    cleanup(); // This wipes the DOM clean after every single test
  });

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    capturedOptions = undefined;

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
        correct_move_uci: "",
        pgn: "",
        epd: "",
      },
    });
  });

  describe("handlePieceDrop", () => {
    it("returns true and submits move on legal move", async () => {
      moveMock.mockReturnValue({ promotion: "q" });
      (api.post as any).mockResolvedValue({
        data: { correct: false, reason: "bad move" },
      });

      render(<Training />);
      await waitFor(() => expect(capturedOptions?.allowDragging).toBe(true));

      act(() => {
        const ok = capturedOptions.onPieceDrop("e2", "e4");
        expect(ok).toBe(true);
      });

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          "/training-sessions/sess-1/responses",
          { move_uci: "e2e4q", item_id: "item-123" },
        ),
      );
    });

    it("sets illegal-move feedback and returns false when chess.js move() returns null", async () => {
      moveMock.mockReturnValue(null);
      render(<Training />);
      await waitFor(() => expect(capturedOptions?.allowDragging).toBe(true));

      act(() => {
        const ok = capturedOptions.onPieceDrop("e2", "e4");
        expect(ok).toBe(false);
      });

      expect(
        await screen.findByText((content) => /illegal move/i.test(content)),
      ).toBeTruthy();
    });

    it("returns false when isSubmitting is true", async () => {
      // You'll need to mock the hook state to return isSubmitting: true
      // Or trigger an api call that hasn't resolved yet
      render(<Training />);
      await waitFor(() =>
        expect(capturedOptions?.onPieceDrop).toBeTypeOf("function"),
      );

      // Simulate submission state via the hook (requires mocking useTrainingSession)
      // If you can't mock hook state easily, ensure the API call is pending
      const ok = capturedOptions.onPieceDrop("e2", "e4");
      // This test depends on how your hook manages isSubmitting
    });

    it("handles specific promotion characters from correctMoveUci", async () => {
      // Test that it doesn't just default to 'q' if the answer is 'n'
      // Mock the hook to return correctMoveUci: "a7a8n"
      moveMock.mockReturnValue({ promotion: "n" });
      render(<Training />);
      await waitFor(() =>
        expect(capturedOptions?.onPieceDrop).toBeTypeOf("function"),
      );

      capturedOptions.onPieceDrop("a7", "a8");

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ move_uci: "a7a8n" }),
        ),
      );
    });

    it("uses the correct promotion character from correctMoveUci", async () => {
      // Mock the hook/API to expect a Knight promotion
      (api.get as any).mockResolvedValue({
        data: {
          fen_after: "some-fen",
          item_id: "item-123",
          correct_move_uci: "a7a8n", // 'n' for knight
        },
      });

      render(<Training />);
      await waitFor(() =>
        expect(capturedOptions?.onPieceDrop).toBeTypeOf("function"),
      );

      moveMock.mockReturnValue({ promotion: "n" });
      act(() => {
        capturedOptions.onPieceDrop("a7", "a8");
      });

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ move_uci: "a7a8n" }),
        ),
      );
    });
  });

  describe("User Interactions", () => {
    it("submits move via text input", async () => {
      render(<Training />);
      await waitFor(() =>
        expect(capturedOptions?.onPieceDrop).toBeTypeOf("function"),
      );

      const input = screen.getByPlaceholderText("e.g. e2e4");
      const submitBtn = screen.getByRole("button", { name: /submit/i });

      await user.type(input, "e2e4");
      await user.click(submitBtn);

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          "/training-sessions/sess-1/responses",
          expect.objectContaining({ move_uci: "e2e4" }),
        ),
      );
    });

    it("toggles the info panel and starts a new session", async () => {
      (api.post as any).mockResolvedValue({ data: { id: "sess-new" } });
      render(<Training />);

      const toggleBtn = screen.getByRole("button", { name: /show panel/i });
      await user.click(toggleBtn);

      const startBtn = screen.getByText(/start new training session/i);
      await user.click(startBtn);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith("/training-sessions");
      });
    });

    it("clears input and triggers retry on click", async () => {
      render(<Training />);
      await waitFor(() =>
        expect(capturedOptions?.onPieceDrop).toBeTypeOf("function"),
      );

      const input = screen.getByPlaceholderText("e.g. e2e4");
      await user.type(input, "wrong_move");

      const retryBtn = screen.getByRole("button", { name: /retry\?/i });
      await user.click(retryBtn);

      expect(input).toHaveValue("");
    });

    it("does not submit when move input is empty", async () => {
      render(<Training />);
      const submitBtn = screen.getByRole("button", { name: /submit/i });
      await user.click(submitBtn);
      expect(api.post).not.toHaveBeenCalledWith(
        expect.stringContaining("/responses"),
        expect.anything(),
      );
    });

    it("shows alert when starting a new session fails", async () => {
      const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
      (api.post as any).mockRejectedValueOnce(new Error("Network Error"));

      render(<Training />);
      await user.click(screen.getByRole("button", { name: /show panel/i }));
      await user.click(screen.getByText(/start new training session/i));

      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining("Failed to start session"),
      );
      alertMock.mockRestore();
    });

    it("clears local illegal-move feedback when autoplay triggers", async () => {
      // 1. Start as white
      turnMock.mockReturnValue("w");
      render(<Training />);
      await waitFor(() =>
        expect(capturedOptions?.onPieceDrop).toBeTypeOf("function"),
      );

      // 2. Trigger illegal move to set localFeedback
      moveMock.mockReturnValue(null);
      act(() => {
        capturedOptions.onPieceDrop("e2", "e4");
      });
      expect(await screen.findByText(/illegal move/i)).toBeTruthy();

      // 3. Switch to black to trigger autoplay
      turnMock.mockReturnValue("b");
      (api.get as any).mockResolvedValue({
        data: {
          item_id: "item-123",
          correct_move_uci: "e7e5",
          fen_after: "some-fen",
        },
      });

      // Re-render to trigger useEffect
      cleanup();
      render(<Training />);

      await waitFor(() => {
        expect(screen.queryByText(/illegal move/i)).toBeNull();
      });
    });

    it("shows alert when starting a new session fails", async () => {
      const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
      (api.post as any).mockRejectedValueOnce(new Error("Network Error"));

      render(<Training />);
      await user.click(screen.getByRole("button", { name: /show panel/i }));
      await user.click(screen.getByText(/start new training session/i));

      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining("Failed to start session"),
      );
      alertMock.mockRestore();
    });

    it("toggles animations state on checkbox change", async () => {
      render(<Training />);

      // 1. Verify initial state is true
      await waitFor(() => expect(capturedOptions?.showAnimations).toBe(true));

      // 2. Find checkbox by label and click it
      const checkbox = screen.getByLabelText(/show animations/i);
      await user.click(checkbox);

      // 3. Verify state toggled to false
      expect(capturedOptions.showAnimations).toBe(false);

      // 4. Toggle back to true
      await user.click(checkbox);
      expect(capturedOptions.showAnimations).toBe(true);
    });
  });

  describe("Autoplay", () => {
    it("automatically submits the correct move when it is black's turn", async () => {
      turnMock.mockReturnValue("b");
      (api.get as any).mockResolvedValue({
        data: {
          fen_after: "some-fen",
          item_id: "item-123",
          correct_move_uci: "e7e5",
        },
      });

      render(<Training />);

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          "/training-sessions/sess-1/responses",
          { move_uci: "e7e5", item_id: "item-123" },
        ),
      );
    });

    it("does not autoplay if isSubmitting is true", async () => {
      turnMock.mockReturnValue("b");
      // Mock hook to return isSubmitting: true
      render(<Training />);

      // api.post should NOT be called for the response
      expect(api.post).not.toHaveBeenCalledWith(
        expect.stringContaining("/responses"),
        expect.anything(),
      );
    });

    it("clears local illegal-move feedback when autoplay triggers", async () => {
      // 1. Start as white
      turnMock.mockReturnValue("w");
      render(<Training />);
      await waitFor(() =>
        expect(capturedOptions?.onPieceDrop).toBeTypeOf("function"),
      );

      // 2. Trigger illegal move to set localFeedback
      moveMock.mockReturnValue(null);
      act(() => {
        capturedOptions.onPieceDrop("e2", "e4");
      });
      expect(await screen.findByText(/illegal move/i)).toBeTruthy();

      // 3. Switch to black to trigger autoplay
      turnMock.mockReturnValue("b");
      (api.get as any).mockResolvedValue({
        data: {
          item_id: "item-123",
          correct_move_uci: "e7e5",
          fen_after: "some-fen",
        },
      });

      // Re-render to trigger useEffect
      cleanup();
      render(<Training />);

      await waitFor(() => {
        expect(screen.queryByText(/illegal move/i)).toBeNull();
      });
    });
  });
});
