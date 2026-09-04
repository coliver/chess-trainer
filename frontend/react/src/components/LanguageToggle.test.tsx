import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../i18n/i18n";
import { LanguageToggle } from "./LanguageToggle";
import { HomeHeader } from "./HomeHeader";
import { MemoryRouter } from "react-router-dom";
import { PreferencesProvider } from "../context/PreferencesContext";
import { useAuth } from "../hooks/useAuth";

vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

const renderLanguageToggle = () =>
  render(
    <PreferencesProvider>
      <LanguageToggle />
    </PreferencesProvider>,
  );

describe("LanguageToggle", () => {
  beforeEach(async () => {
    localStorage.clear();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoggedIn: false,
      username: null,
    });
    await act(async () => {
      await i18n.changeLanguage("en-US");
    });
  });

  afterEach(async () => {
    localStorage.clear();
    await act(async () => {
      await i18n.changeLanguage("en-US");
    });
  });

  it("defaults to English", () => {
    renderLanguageToggle();
    expect(screen.getByRole("combobox")).toHaveValue("en-US");
  });

  it("switches language on selection and persists to localStorage", async () => {
    const user = userEvent.setup();
    renderLanguageToggle();

    await user.selectOptions(screen.getByRole("combobox"), "es");

    await waitFor(() => expect(i18n.language).toBe("es"));
    expect(localStorage.getItem("language")).toBe("es");
  });

  it("changing language re-renders translated text elsewhere on the page", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoggedIn: true,
      username: "alice",
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <PreferencesProvider>
          <LanguageToggle />
          <HomeHeader />
        </PreferencesProvider>
      </MemoryRouter>,
    );

    const sectionTabs = screen.getByRole("navigation", {
      name: "Section tabs",
    });
    expect(within(sectionTabs).getByText("Openings")).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox"), "es");

    expect(
      await within(sectionTabs).findByText("Aperturas"),
    ).toBeInTheDocument();
  });

  it("reads a previously saved language from localStorage on init", async () => {
    localStorage.setItem("language", "es");
    await act(async () => {
      await i18n.changeLanguage("es");
    });

    renderLanguageToggle();
    expect(screen.getByRole("combobox")).toHaveValue("es");
  });
});
