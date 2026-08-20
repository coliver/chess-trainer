import { useCallback, useState } from "react";

const STORAGE_KEY = "snow_enabled";

function readSnowEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

/**
 * Purely local (localStorage) toggle for the snow easter egg — deliberately
 * not part of Preferences/PreferencesContext, so it never syncs to the
 * backend and needs no user_preferences column.
 */
export function useSnowPreference() {
  const [snowEnabled, setSnowEnabledState] = useState<boolean>(readSnowEnabled);

  const setSnowEnabled = useCallback((value: boolean) => {
    setSnowEnabledState(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  return { snowEnabled, setSnowEnabled };
}
