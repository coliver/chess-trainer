// react/src/pages/Training.autoplay.integration.test.tsx
//
// Integration coverage for the Training page's autoplay effect, using the
// REAL useTrainingSession hook (via MSW) and REAL chess-core move logic
// (chess.js), unlike Training.test.tsx which mocks both. This exercises the
// exact bug found in backend/app/routers/training.py's /next endpoint: a
// "Review" session (from-due, spanning positions pulled from both White-
// and Black-trained openings) always reported player_color as "w" off the
// session row, so a due position where it was actually Black's move to
// solve got misjudged by the frontend's opponent-autoplay effect as "not
// the player's turn" and auto-played FOR the trainee. Fixed by deriving a
// review item's player_color from its own fen. These tests drive the real
// Training component + real hook against that exact fen/correctMoveUci
// shape for both a White-to-move and a Black-to-move due item.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../tests/msw/server";
import { Training } from "./Training";
import "@testing-library/jest-dom";
import type { BoardProps } from "../components/Board";
import { PreferencesProvider } from "../context/PreferencesContext";

const renderTraining = () => (
  <PreferencesProvider>
    <Training />
  </PreferencesProvider>
);

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "sess-1" }),
  useNavigate: () => mockNavigate,
}));

let capturedProps: BoardProps;
vi.mock("../components/Board", () => ({
  default: (props: BoardProps) => {
    capturedProps = props;
    return null;
  },
}));

vi.mock("../components/FenTurnBadge", () => ({
  default: () => null,
}));

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const AFTER_E4_FEN =
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

describe("Training autoplay integration (real hook + real chess-core)", () => {
  beforeEach(() => {
    capturedProps = undefined as unknown as BoardProps;
    mockNavigate.mockClear();
  });

  it("White-to-move due item: waits for the player, does not autoplay their own move for them", async () => {
    // Mirrors a review item pulled from a White-trained opening: fen has
    // White to move, correctMoveUci is the trainee's own expected move, and
    // (post-fix) player_color derived from the fen is "w" — the same as
    // the trainee. The autoplay effect must see side-to-move === playerColor
    // and do nothing, leaving the move for the player.
    server.use(
      http.get(/\/api\/training-sessions\/[^/]+\/next\/?(?:\?.*)?$/, () => {
        return HttpResponse.json({
          itemId: "1",
          fen: START_FEN,
          openingEco: "C20",
          openingName: "King's Pawn Game",
          correctMoveUci: "e2e4",
          playerColor: "w",
        });
      }),
    );

    render(renderTraining());
    await waitFor(() => expect(capturedProps).toBeDefined());

    // Give the autoplay effect every chance to (wrongly) fire.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(capturedProps.position).toBe(START_FEN);
    expect(capturedProps.onMoveStart?.("e2")).toBe(true);
    expect(capturedProps.onMoveStart?.("e7")).toBe(false);
  });

  it("Black-to-move due item: autoplays nothing, leaves the trainee's own move for them (the bug this guards)", async () => {
    // Mirrors a review item pulled from a Black-trained opening: fen has
    // Black to move, and correctMoveUci is the trainee's (Black's) own
    // expected reply — not an opponent setup move to auto-play. Before the
    // backend fix, player_color came from the session row (always "w" for
    // a review session), so sideToMove(fen)="b" !== playerColor="w" made
    // the frontend treat this as "the opponent's turn" and auto-play the
    // trainee's own correct move for them. Post-fix, playerColor is "b"
    // (derived from the fen), matching sideToMove, so autoplay must skip.
    server.use(
      http.get(/\/api\/training-sessions\/[^/]+\/next\/?(?:\?.*)?$/, () => {
        return HttpResponse.json({
          itemId: "9",
          fen: AFTER_E4_FEN,
          openingEco: "C20",
          openingName: "King's Pawn Game",
          correctMoveUci: "e7e5",
          playerColor: "b",
        });
      }),
    );

    render(renderTraining());
    await waitFor(() => expect(capturedProps).toBeDefined());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // The position must still be exactly the due fen — e7e5 must NOT have
    // been auto-played on the trainee's behalf.
    expect(capturedProps.position).toBe(AFTER_E4_FEN);
    expect(capturedProps.onMoveStart?.("e7")).toBe(true);
    expect(capturedProps.onMoveStart?.("e2")).toBe(false);
  });
});
