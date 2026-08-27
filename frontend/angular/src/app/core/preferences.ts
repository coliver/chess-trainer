// Angular port of react/src/preferences.ts — kept behaviorally identical
// (same localStorage keys) so switching between the two frontends doesn't
// lose local preference state.

export type Theme = 'light' | 'dark' | 'system';
export type BoardTheme =
  | 'default'
  | 'default-contrast'
  | 'green'
  | 'blue'
  | 'chess-club'
  | 'chessboard-js'
  | 'black-and-white';
export type PieceSet = 'standard' | 'staunty' | 'merida' | 'pirouetti' | 'chessnut';
export type BoardOrientationMode = 'auto' | 'white' | 'black';

export interface Preferences {
  language: string;
  theme: Theme;
  board_theme: BoardTheme;
  piece_set: PieceSet;
  show_coordinates: boolean;
  board_animations: boolean;
  board_orientation_mode: BoardOrientationMode;
  sound: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  language: 'en-US',
  theme: 'system',
  board_theme: 'default',
  piece_set: 'standard',
  show_coordinates: true,
  board_animations: true,
  board_orientation_mode: 'auto',
  sound: false,
};

const STORAGE_KEYS: Record<keyof Preferences, string> = {
  language: 'language',
  theme: 'theme',
  board_theme: 'board_theme',
  piece_set: 'piece_set',
  show_coordinates: 'show_coordinates',
  board_animations: 'board_animations',
  board_orientation_mode: 'board_orientation_mode',
  sound: 'sound',
};

/** Reads locally-persisted preferences (guest/pre-hydration state), falling back to defaults. */
export function readLocalPreferences(): Preferences {
  const prefs = { ...DEFAULT_PREFERENCES };
  for (const key of Object.keys(STORAGE_KEYS) as (keyof Preferences)[]) {
    const raw = localStorage.getItem(STORAGE_KEYS[key]);
    if (raw === null) continue;
    if (typeof DEFAULT_PREFERENCES[key] === 'boolean') {
      (prefs[key] as boolean) = raw === 'true';
    } else {
      (prefs[key] as string) = raw;
    }
  }
  return prefs;
}

export function writeLocalPreferences(partial: Partial<Preferences>): void {
  for (const [key, value] of Object.entries(partial) as [keyof Preferences, unknown][]) {
    localStorage.setItem(STORAGE_KEYS[key], String(value));
  }
}

/** Resolves a theme preference to the concrete light/dark value to apply. */
export function resolveTheme(theme: Theme | string): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') return theme;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
  return prefersDark ? 'dark' : 'light';
}
