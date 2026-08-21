// src/components/ProgressStat.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressStat } from "./ProgressStat";

describe("ProgressStat", () => {
  it("renders icon, value, and label", () => {
    render(<ProgressStat icon="🎯" value="42%" label="Accuracy" />);

    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("Accuracy")).toBeInTheDocument();
  });

  it("applies the mastery variant class and renders children", () => {
    render(
      <ProgressStat icon="🏆" value={3} label="Mastered" variant="mastery">
        <div data-testid="bar" />
      </ProgressStat>,
    );

    // eslint-disable-next-line testing-library/no-node-access -- asserting a CSS variant class has no query-role equivalent
    expect(screen.getByText("Mastered").closest(".progress-stat")).toHaveClass(
      "progress-stat--mastery",
    );
    expect(screen.getByTestId("bar")).toBeInTheDocument();
  });
});
