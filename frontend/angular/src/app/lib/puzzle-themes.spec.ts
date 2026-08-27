import { formatThemeLabel, themeIcon, MATE_FENS, THEME_GROUPS } from './puzzle-themes';

describe('formatThemeLabel', () => {
  it('inserts a space before an internal capital letter', () => {
    expect(formatThemeLabel('backRankMate')).toBe('back Rank Mate');
  });

  it('leaves single-word themes unchanged', () => {
    expect(formatThemeLabel('fork')).toBe('fork');
  });
});

describe('themeIcon', () => {
  it('returns the mapped icon for a known theme', () => {
    expect(themeIcon('fork')).toBe('♞');
  });

  it('falls back to the default icon for an unknown theme', () => {
    expect(themeIcon('notARealTheme')).toBe('♟️');
  });
});

describe('THEME_GROUPS / MATE_FENS', () => {
  it('every mate FEN key belongs to a theme listed in THEME_GROUPS', () => {
    const allThemes = new Set(THEME_GROUPS.flatMap((g) => g.themes));
    for (const theme of Object.keys(MATE_FENS)) {
      expect(allThemes.has(theme)).toBe(true);
    }
  });
});
