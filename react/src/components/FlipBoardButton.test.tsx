import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlipBoardButton } from "./FlipBoardButton";

describe("FlipBoardButton", () => {
  it("renders and calls onClick, accumulating rotation on repeated clicks", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<FlipBoardButton onClick={onClick} />);

    const btn = screen.getByRole("button", { name: /flip board/i });
    const icon = within(btn).getByText("⟳");
    expect(icon.style.transform).toBe("rotate(0deg)");

    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(icon.style.transform).toBe("rotate(180deg)");

    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(icon.style.transform).toBe("rotate(360deg)");
  });

  it("works without an onClick prop", async () => {
    const user = userEvent.setup();
    render(<FlipBoardButton />);
    await user.click(screen.getByRole("button", { name: /flip board/i }));
    // no throw
  });
});
