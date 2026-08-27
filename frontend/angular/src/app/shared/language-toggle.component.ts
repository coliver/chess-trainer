import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { LANGUAGES, TranslateService } from '../core/i18n/translate.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { PreferencesStoreService } from '../core/preferences-store.service';

// One flag per configured language. Falls back to the language code itself
// if a new locale file is added before its flag is picked. Kept in sync with
// react/src/components/LanguageToggle.tsx's FLAGS map.
const FLAGS: Partial<Record<string, string>> = {
  'en-GB': '🇬🇧',
  'en-US': '🇺🇸',
  'en-AU': '🇦🇺',

  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  hi: '🇮🇳',
  it: '🇮🇹',
  ja: '🇯🇵',
  kl: '🖖',
  ko: '🇰🇷',
  nl: '🇳🇱',
  pl: '🇵🇱',
  pt: '🇵🇹',
  'pt-BR': '🇧🇷',
  ru: '🇷🇺',
  tr: '🇹🇷',
  'zh-CN': '🇨🇳',

  ar: '🇸🇦',
  cs: '🇨🇿',
  da: '🇩🇰',
  el: '🇬🇷',
  fi: '🇫🇮',
  he: '🇮🇱',
  hu: '🇭🇺',
  id: '🇮🇩',
  ms: '🇲🇾',
  no: '🇳🇴',
  ro: '🇷🇴',
  sk: '🇸🇰',
  sv: '🇸🇪',
  uk: '🇺🇦',
  vi: '🇻🇳',

  'en-x-pirate': '🏴‍☠️',
  'en-x-groot': '🌱',

  sd: '🧝',
  khz: '⛏️',
};

@Component({
  selector: 'app-language-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TranslatePipe],
  template: `
    <select
      class="language-toggle-select"
      [value]="translate.lang()"
      (change)="onChange($event)"
      [attr.aria-label]="'language.toggle' | translate"
      [attr.title]="'language.toggle' | translate"
    >
      @for (lang of languages; track lang) {
        <option [value]="lang">{{ flags[lang] ?? lang }}</option>
      }
    </select>
  `,
})
export class LanguageToggleComponent {
  readonly translate = inject(TranslateService);
  private readonly preferencesStore = inject(PreferencesStoreService);
  readonly languages = [...LANGUAGES].sort((a, b) => a.localeCompare(b));
  readonly flags = FLAGS;

  onChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    // Routed through the preferences store (not TranslateService directly)
    // so it's persisted/synced the same way every other preference is —
    // the store's own effect is what actually calls translate.setLanguage().
    this.preferencesStore.update({ language: value });
  }
}
