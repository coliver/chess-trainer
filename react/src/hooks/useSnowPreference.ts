import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "snow_enabled";

const listeners = new Set<() => void>();

function readSnowEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Purely local (localStorage) toggle for the snow easter egg — deliberately
 * not part of Preferences/PreferencesContext, so it never syncs to the
 * backend and needs no user_preferences column.
 *
 * localStorage is treated as the external store so every instance of this
 * hook (Settings.tsx's toggle, App.tsx's animation effect) reads the same
 * value and re-renders together, including within the same tab where the
 * native `storage` event doesn't fire.
 */
export function useSnowPreference() {
  const snowEnabled = useSyncExternalStore(subscribe, readSnowEnabled);

  const setSnowEnabled = useCallback((value: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(value));
    listeners.forEach((listener) => listener());
  }, []);

  return { snowEnabled, setSnowEnabled };
}
