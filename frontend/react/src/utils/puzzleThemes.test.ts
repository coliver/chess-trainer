import { describe, it, expect } from "vitest";
import {
  formatThemeLabel,
  themeIcon,
  THEME_GROUPS,
  MATE_FENS,
} from "./puzzleThemes";

describe("puzzleThemes utils", () => {
  describe("formatThemeLabel", () => {
    it("converts camelCase theme names to space-separated words", () => {
      expect(formatThemeLabel("backRankMate")).toBe("back Rank Mate");
      expect(formatThemeLabel("discoveredAttack")).toBe("discovered Attack");
      expect(formatThemeLabel("fork")).toBe("fork");
    });

    it("preserves numbers in theme names", () => {
      expect(formatThemeLabel("mateIn2")).toBe("mate In2");
      expect(formatThemeLabel("oneMove")).toBe("one Move");
    });
  });

  describe("themeIcon", () => {
    it("returns the correct icon for known themes", () => {
      expect(themeIcon("fork")).toBe("♞");
      expect(themeIcon("pin")).toBe("📌");
      expect(themeIcon("mateIn1")).toBe("1️⃣");
    });

    it("returns default pawn icon for unknown themes", () => {
      expect(themeIcon("unknownTheme")).toBe("♟️");
      expect(themeIcon("notATheme")).toBe("♟️");
    });
  });

  describe("THEME_GROUPS", () => {
    it("exports an array of theme groups", () => {
      expect(Array.isArray(THEME_GROUPS)).toBe(true);
      expect(THEME_GROUPS.length).toBeGreaterThan(0);
    });

    it("each group has a key and themes array", () => {
      THEME_GROUPS.forEach((group) => {
        expect(group).toHaveProperty("key");
        expect(group).toHaveProperty("themes");
        expect(Array.isArray(group.themes)).toBe(true);
      });
    });
  });

  describe("MATE_FENS", () => {
    it("exports FEN strings for named mate patterns", () => {
      expect(MATE_FENS).toHaveProperty("backRankMate");
      expect(MATE_FENS).toHaveProperty("smotheredMate");
      expect(typeof MATE_FENS.backRankMate).toBe("string");
    });
  });
});
