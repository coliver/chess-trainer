// src/components/SettingsToggleRow.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsToggleRow } from "./SettingsToggleRow";

describe("SettingsToggleRow", () => {
  it("reflects the checked state and calls onChange with the new value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SettingsToggleRow label="Sound" checked={false} onChange={onChange} />,
    );

    const checkbox = screen.getByLabelText("Sound") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    await user.click(checkbox);

    expect(onChange).toHaveBeenCalledWith(true);
  });
});
