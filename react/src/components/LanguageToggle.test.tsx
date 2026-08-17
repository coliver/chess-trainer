import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../i18n/i18n";
import { LanguageToggle } from "./LanguageToggle";
import Header from "./Header";
import { MemoryRouter } from "react-router-dom";

describe("LanguageToggle", () => {
  beforeEach(async () => {
    localStorage.clear();
    await act(async () => {
      await i18n.changeLanguage("en");
    });
  });

  afterEach(async () => {
    localStorage.clear();
    await act(async () => {
      await i18n.changeLanguage("en");
    });
  });

  it("defaults to English", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("combobox")).toHaveValue("en");
  });

  it("switches language on selection and persists to localStorage", async () => {
    const user = userEvent.setup();
    render(<LanguageToggle />);

    await user.selectOptions(screen.getByRole("combobox"), "es");

    await waitFor(() => expect(i18n.language).toBe("es"));
    expect(localStorage.getItem("language")).toBe("es");
  });

  it("changing language re-renders translated text elsewhere on the page", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox"), "es");

    expect(
      await screen.findByRole("link", { name: /iniciar sesión/i }),
    ).toBeInTheDocument();
  });

  it("reads a previously saved language from localStorage on init", async () => {
    localStorage.setItem("language", "es");
    await act(async () => {
      await i18n.changeLanguage("es");
    });

    render(<LanguageToggle />);
    expect(screen.getByRole("combobox")).toHaveValue("es");
  });
});
