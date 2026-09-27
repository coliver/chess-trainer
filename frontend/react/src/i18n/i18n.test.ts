import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";

describe("i18n", () => {
  beforeEach(() => {
    // Reset document.documentElement.lang before each test
    document.documentElement.lang = "en-US";
  });

  afterEach(() => {
    localStorage.clear();
    vi.resetModules();
    document.documentElement.lang = "en-US";
  });

  describe("initialization", () => {
    it("defaults to en-US when localStorage is empty", async () => {
      localStorage.clear();
      const i18n = (await import("./i18n")).default;
      expect(i18n.language).toBe("en-US");
      expect(document.documentElement.lang).toBe("en-US");
    });

    it("uses stored language when it exists in available languages", async () => {
      localStorage.clear();
      localStorage.setItem("language", "es");
      vi.resetModules();
      const i18n = (await import("./i18n")).default;
      expect(i18n.language).toBe("es");
      expect(document.documentElement.lang).toBe("es");
    });

    it("defaults to en-US when stored language is not in available languages", async () => {
      localStorage.clear();
      localStorage.setItem("language", "not-a-language");
      vi.resetModules();
      const i18n = (await import("./i18n")).default;
      expect(i18n.language).toBe("en-US");
      expect(document.documentElement.lang).toBe("en-US");
    });
  });

  describe("language change event", () => {
    it("updates document.documentElement.lang when language changes", async () => {
      localStorage.clear();
      const i18n = (await import("./i18n")).default;
      expect(document.documentElement.lang).toBe("en-US");

      await i18n.changeLanguage("fr");
      expect(document.documentElement.lang).toBe("fr");
    });

    it("handles multiple language changes", async () => {
      localStorage.clear();
      const i18n = (await import("./i18n")).default;

      await i18n.changeLanguage("de");
      expect(document.documentElement.lang).toBe("de");

      await i18n.changeLanguage("ja");
      expect(document.documentElement.lang).toBe("ja");
    });
  });
});
