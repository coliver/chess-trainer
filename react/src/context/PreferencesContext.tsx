import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import i18n from "../i18n/i18n";
import api from "../api";
import { useAuth } from "../hooks/useAuth";
import { setSoundsEnabled } from "../utils/sound";
import {
  readLocalPreferences,
  writeLocalPreferences,
  type Preferences,
} from "../preferences";

type PreferencesContextValue = {
  preferences: Preferences;
  update: (partial: Partial<Preferences>) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [preferences, setPreferences] = useState<Preferences>(readLocalPreferences);

  // Hydrate from the backend when logged in; fall back to local/guest state
  // otherwise. This mirrors an external system (localStorage / the backend),
  // which is the sanctioned use of an Effect — see
  // https://react.dev/learn/you-might-not-need-an-effect.
  useEffect(() => {
    if (!isLoggedIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreferences(readLocalPreferences());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/users/me/preferences");
        if (!cancelled) setPreferences((prev) => ({ ...prev, ...data }));
      } catch {
        // Keep local/default preferences if the fetch fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // Keep i18next in sync whenever the language preference changes, whether
  // from a local toggle or a value hydrated from the backend on login.
  useEffect(() => {
    if (preferences.language && preferences.language !== i18n.language) {
      void i18n.changeLanguage(preferences.language);
    }
  }, [preferences.language]);

  // Keep sound system in sync with preferences.
  useEffect(() => {
    setSoundsEnabled(preferences.sound);
  }, [preferences.sound]);

  const update = useCallback(
    (partial: Partial<Preferences>) => {
      setPreferences((prev) => ({ ...prev, ...partial }));
      writeLocalPreferences(partial);
      if (isLoggedIn) {
        api.patch("/users/me/preferences", partial).catch(() => {
          // Best-effort sync; local state is already applied optimistically.
        });
      }
    },
    [isLoggedIn],
  );

  return (
    <PreferencesContext.Provider value={{ preferences, update }}>
      {children}
    </PreferencesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context + hook colocation is the standard pattern
export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within a PreferencesProvider");
  return ctx;
}
