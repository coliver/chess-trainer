// src/components/SettingsRadioGroup.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsRadioGroup } from "./SettingsRadioGroup";

describe("SettingsRadioGroup", () => {
  const options = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  it("marks the selected option and calls onChange when another is picked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SettingsRadioGroup
        name="theme"
        ariaLabel="Theme"
        value="light"
        options={options}
        onChange={onChange}
      />,
    );

    expect(
      (screen.getByRole("radio", { name: "Light" }) as HTMLInputElement)
        .checked,
    ).toBe(true);

    await user.click(screen.getByRole("radio", { name: "Dark" }));

    expect(onChange).toHaveBeenCalledWith("dark");
  });

  it("wraps in a labeled row when rowLabel is provided", () => {
    render(
      <SettingsRadioGroup
        name="theme"
        ariaLabel="Theme"
        rowLabel="Theme"
        value="light"
        options={options}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Theme").length).toBeGreaterThan(0);
  });
});
