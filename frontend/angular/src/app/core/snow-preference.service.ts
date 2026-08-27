import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'snow_enabled';

/**
 * Angular counterpart of react/src/hooks/useSnowPreference.ts. Purely local
 * (localStorage) toggle for the snow easter egg, deliberately not part of
 * PreferencesStoreService so it never syncs to the backend and needs no
 * user_preferences column.
 *
 * A single injected service with a signal already gives every consumer
 * (Settings' toggle, AppComponent's animation effect) the same reactive
 * value React gets from useSyncExternalStore + a module-level listener set.
 */
@Injectable({ providedIn: 'root' })
export class SnowPreferenceService {
  readonly enabled = signal(localStorage.getItem(STORAGE_KEY) === 'true');

  setEnabled(value: boolean): void {
    localStorage.setItem(STORAGE_KEY, String(value));
    this.enabled.set(value);
  }
}
