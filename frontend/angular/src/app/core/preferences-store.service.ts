import { Injectable, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { PreferencesService } from './preferences.service';
import { TranslateService } from './i18n/translate.service';
import {
  DEFAULT_PREFERENCES,
  Preferences,
  readLocalPreferences,
  resolveTheme,
  writeLocalPreferences,
} from './preferences';

/**
 * Angular counterpart of react/src/context/PreferencesContext.tsx — signal-
 * based store standing in for React's context/provider. Hydrates from the
 * backend on login (falling back to local/guest state otherwise), and keeps
 * the document theme + TranslateService's language in sync with whatever the
 * current preferences are, wherever they came from.
 */
@Injectable({ providedIn: 'root' })
export class PreferencesStoreService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(PreferencesService);
  private readonly translate = inject(TranslateService);

  readonly preferences = signal<Preferences>(readLocalPreferences());

  constructor() {
    effect(() => {
      if (!this.auth.loggedIn()) {
        this.preferences.set(readLocalPreferences());
        return;
      }
      this.api.get().subscribe({
        next: (data) => this.preferences.update((prev) => ({ ...prev, ...data })),
        // Keep local/default preferences if the fetch fails.
        error: () => undefined,
      });
    });

    effect(() => {
      const theme = this.preferences().theme;
      document.documentElement.dataset['theme'] = resolveTheme(theme);
    });

    // One-directional: preferences.language drives TranslateService, not the
    // other way around. LanguageToggleComponent updates language through
    // this store's `update()` rather than calling TranslateService directly,
    // so there's a single writer and no risk of the two fighting each other.
    effect(() => {
      const language = this.preferences().language;
      if (language) {
        void this.translate.setLanguage(language);
      }
    });
  }

  update(partial: Partial<Preferences>): void {
    this.preferences.update((prev) => ({ ...prev, ...partial }));
    writeLocalPreferences(partial);
    if (this.auth.loggedIn()) {
      this.api.update(partial).subscribe({ error: () => undefined });
    }
  }

  reset(): void {
    this.preferences.set(DEFAULT_PREFERENCES);
    writeLocalPreferences(DEFAULT_PREFERENCES);
    if (this.auth.loggedIn()) {
      this.api.update(DEFAULT_PREFERENCES).subscribe({ error: () => undefined });
    }
  }
}
