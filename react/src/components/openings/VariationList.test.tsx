import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VariationList from "./VariationList";
import type { Opening } from "../../pages/Dashboard";

const op = (name: string, eco: string): Opening => ({ name, eco, uci_moves: "" });

describe("VariationList", () => {
  it("renders single-row groups as plain rows and picks on click", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const rows = [op("Sicilian Defense", "B20"), op("Sicilian Defense: Dragon Variation", "B70")];

    render(<VariationList rows={rows} selectedKey={null} onPick={onPick} />);

    expect(screen.getByText("Main line")).toBeInTheDocument();
    const dragonRow = screen.getByText("Dragon Variation");
    await user.click(dragonRow);
    expect(onPick).toHaveBeenCalledWith(rows[1]);
  });

  it("clusters multi-row sub-variations under a collapsible header, collapsed by default", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const rows = [
      op("Sicilian Defense", "B20"),
      op("Sicilian Defense: Najdorf Variation, 6.Be3", "B90"),
      op("Sicilian Defense: Najdorf Variation, 6.Bg5", "B90"),
    ];

    render(<VariationList rows={rows} selectedKey={null} onPick={onPick} />);

    const header = screen.getByRole("button", { name: /Najdorf Variation/i });
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("6.Be3")).not.toBeInTheDocument();

    await user.click(header);
    expect(header).toHaveAttribute("aria-expanded", "true");
    const row = screen.getByText("6.Be3");
    expect(row).toBeInTheDocument();

    await user.click(row);
    expect(onPick).toHaveBeenCalledWith(rows[1]);

    // toggle closed again
    await user.click(header);
    expect(header).toHaveAttribute("aria-expanded", "false");
  });

  it("auto-expands a group that contains the selected row", () => {
    const rows = [
      op("Sicilian Defense", "B20"),
      op("Sicilian Defense: Najdorf Variation, 6.Be3", "B90"),
      op("Sicilian Defense: Najdorf Variation, 6.Bg5", "B90"),
    ];

    render(
      <VariationList
        rows={rows}
        selectedKey="B90Sicilian Defense: Najdorf Variation, 6.Be3"
        onPick={vi.fn()}
      />,
    );

    const header = screen.getByRole("button", { name: /Najdorf Variation/i });
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("6.Be3")).toBeInTheDocument();
  });

  it("marks the selected row with aria-pressed", () => {
    const rows = [op("Sicilian Defense", "B20"), op("Sicilian Defense: Dragon Variation", "B70")];

    render(
      <VariationList rows={rows} selectedKey="B20Sicilian Defense" onPick={vi.fn()} />,
    );

    const mainLineBtn = screen.getByText("Main line").closest("button")!;
    expect(mainLineBtn).toHaveAttribute("aria-pressed", "true");
  });
});
