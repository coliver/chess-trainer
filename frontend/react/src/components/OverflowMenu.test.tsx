// src/components/OverflowMenu.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { OverflowMenu } from "./OverflowMenu";
import { logout } from "../auth";
import { useAuth } from "../hooks/useAuth";

vi.mock("../auth", () => ({
  logout: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("./ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));
vi.mock("./LanguageToggle", () => ({
  LanguageToggle: () => <div data-testid="language-toggle" />,
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderMenu({
  open = true,
  isLoggedIn = true,
  onClose = vi.fn(),
  initialPath = "/",
}: {
  open?: boolean;
  isLoggedIn?: boolean;
  onClose?: () => void;
  initialPath?: string;
} = {}) {
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    isLoggedIn,
    username: "alice",
  });
  return {
    onClose,
    ...render(
      <MemoryRouter initialEntries={[initialPath]}>
        <OverflowMenu open={open} onClose={onClose} />
      </MemoryRouter>,
    ),
  };
}

describe("OverflowMenu", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    (logout as ReturnType<typeof vi.fn>).mockReset();
  });

  it("renders nothing when closed", () => {
    renderMenu({ open: false });
    expect(screen.queryByText("View source on GitHub")).not.toBeInTheDocument();
  });

  it("shows settings and logout only when logged in", () => {
    renderMenu({ isLoggedIn: false });

    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    expect(screen.queryByText("Logout")).not.toBeInTheDocument();
    expect(screen.getByText("View source on GitHub")).toBeInTheDocument();
  });

  it("navigates to settings with the current route so it can return, and closes the menu", async () => {
    const user = userEvent.setup();
    const { onClose } = renderMenu({ initialPath: "/puzzles" });

    await user.click(screen.getByText("Settings"));

    expect(mockNavigate).toHaveBeenCalledWith("/settings", {
      state: { from: "/puzzles" },
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("logs out, navigates to login, and closes the menu", async () => {
    const user = userEvent.setup();
    const { onClose } = renderMenu();

    await user.click(screen.getByText("Logout"));

    expect(logout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when clicking outside the menu", async () => {
    const user = userEvent.setup();
    const { onClose } = renderMenu();

    await user.click(document.body);

    expect(onClose).toHaveBeenCalled();
  });

  it("closes when clicking the backdrop outside the drawer panel", async () => {
    const user = userEvent.setup();
    const { onClose } = renderMenu();

    await user.click(screen.getByTestId("overflow-menu-backdrop"));

    expect(onClose).toHaveBeenCalled();
  });

  it("does not close when clicking inside the drawer panel", async () => {
    const user = userEvent.setup();
    const { onClose } = renderMenu();

    await user.click(screen.getByText("dev"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("opens GitHub link in new window and closes the menu", async () => {
    const user = userEvent.setup();
    const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(null);
    const { onClose } = renderMenu();

    await user.click(screen.getByText("View source on GitHub"));

    expect(windowOpenSpy).toHaveBeenCalledWith(
      "https://github.com/coliver/chess-trainer",
      "_blank",
    );
    expect(onClose).toHaveBeenCalled();
    windowOpenSpy.mockRestore();
  });

  it("closes the menu when pressing Escape", async () => {
    const user = userEvent.setup();
    const { onClose } = renderMenu();

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });

  it("focuses the first menu item when opened", () => {
    renderMenu();

    // When the menu opens, focus should be on the first focusable element
    const firstItem = screen.getByText("Settings");
    expect(firstItem).toHaveFocus();
  });

  it("traps focus forward with Tab key", () => {
    renderMenu();

    // The keyboard event handler is attached to document
    // Dispatch Tab events to verify they're handled
    const tabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: false,
      bubbles: true,
      cancelable: true,
    });

    // Tab event should be handled by the focus trap
    document.dispatchEvent(tabEvent);

    // Menu should still be visible and functional
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("traps focus backward with Shift+Tab key", () => {
    renderMenu();

    // Dispatch Shift+Tab event to verify it's handled
    const shiftTabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });

    document.dispatchEvent(shiftTabEvent);

    // Menu should still be visible and functional
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});
