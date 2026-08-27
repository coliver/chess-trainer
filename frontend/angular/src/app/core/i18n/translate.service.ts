import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

// Locale JSON lives in packages/i18n-locales/locales/ so React, Angular, and
// Rails all read the identical translation content instead of maintaining
// independently-drifting copies (see frontend/react/src/i18n/i18n.ts).
// scripts/sync-i18n-locales.mjs copies it into public/i18n/ before every
// serve/build/test (the Angular CLI's asset glob can't reach outside the
// workspace root), where it's served at the root-absolute /angular/i18n/
// path — same convention as cm-chessboard's ASSETS_URL in board.component.ts.
export const LANGUAGES = [
  'ar', 'cs', 'da', 'de', 'el', 'en-AU', 'en-GB', 'en-US', 'en-x-groot',
  'en-x-pirate', 'es', 'fi', 'fr', 'he', 'hi', 'hu', 'id', 'it', 'ja', 'khz',
  'kl', 'ko', 'ms', 'nl', 'no', 'pl', 'pt', 'pt-BR', 'ro', 'ru', 'sd', 'sk',
  'sv', 'tr', 'uk', 'vi', 'zh-CN',
] as const;

export type Language = (typeof LANGUAGES)[number];

const FALLBACK_LANGUAGE: Language = 'en-US';
const STORAGE_KEY = 'language';

type Resource = Record<string, unknown>;

function toLanguage(value: string | null): Language {
  return (LANGUAGES as readonly string[]).includes(value ?? '')
    ? (value as Language)
    : FALLBACK_LANGUAGE;
}

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private readonly http = inject(HttpClient);
  private readonly resources = new Map<Language, Resource>();
  private readonly pending = new Map<Language, Promise<Resource>>();

  readonly lang = signal<Language>(toLanguage(localStorage.getItem(STORAGE_KEY)));

  /** Loads the current language (and the fallback, if different) before first render. */
  async init(): Promise<void> {
    await this.load(this.lang());
    if (this.lang() !== FALLBACK_LANGUAGE) {
      await this.load(FALLBACK_LANGUAGE);
    }
    document.documentElement.lang = this.lang();
  }

  async setLanguage(language: string): Promise<void> {
    const next = toLanguage(language);
    await this.load(next);
    this.lang.set(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }

  /** Translates `key` (dot-separated path) with optional interpolation/pluralization. */
  t(key: string, params?: Record<string, string | number>): string {
    const count = params?.['count'];
    if (typeof count === 'number') {
      const category = this.pluralCategory(count);
      const plural = this.resolve(`${key}_${category}`) ?? this.resolve(`${key}_other`);
      if (plural !== undefined) {
        return this.interpolate(plural, params);
      }
    }
    const template = this.resolve(key);
    if (template === undefined) {
      return key;
    }
    return this.interpolate(template, params);
  }

  private pluralCategory(count: number): Intl.LDMLPluralRule {
    try {
      return new Intl.PluralRules(this.lang()).select(count);
    } catch {
      return 'other';
    }
  }

  private resolve(key: string): string | undefined {
    const path = key.split('.');
    const fromLang = this.walk(this.resources.get(this.lang()), path);
    if (fromLang !== undefined) {
      return fromLang;
    }
    return this.walk(this.resources.get(FALLBACK_LANGUAGE), path);
  }

  private walk(resource: Resource | undefined, path: string[]): string | undefined {
    let node: unknown = resource;
    for (const segment of path) {
      if (typeof node !== 'object' || node === null) {
        return undefined;
      }
      node = (node as Resource)[segment];
    }
    return typeof node === 'string' ? node : undefined;
  }

  private interpolate(template: string, params?: Record<string, string | number>): string {
    if (!params) {
      return template;
    }
    return template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
      name in params ? String(params[name]) : match,
    );
  }

  private async load(language: Language): Promise<Resource> {
    const cached = this.resources.get(language);
    if (cached) {
      return cached;
    }
    const inFlight = this.pending.get(language);
    if (inFlight) {
      return inFlight;
    }
    const request = firstValueFrom(this.http.get<Resource>(`/angular/i18n/${language}.json`))
      .then((resource) => {
        this.resources.set(language, resource);
        this.pending.delete(language);
        return resource;
      })
      .catch((error) => {
        this.pending.delete(language);
        throw error;
      });
    this.pending.set(language, request);
    return request;
  }
}
