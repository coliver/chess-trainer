import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SettingsComponent } from './settings.component';
import { PreferencesStoreService } from '../../core/preferences-store.service';
import { TranslateService } from '../../core/i18n/translate.service';
import { stubTranslate } from '../../core/i18n/testing';

describe('SettingsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        provideRouter([{ path: 'dashboard', children: [] }]),
        provideLocationMocks(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    stubTranslate(TestBed.inject(TranslateService), {
      'settings.title': 'Settings',
      'settings.subtitle': 'Personalize how Knight School looks and plays.',
      'settings.previewLabel': 'Preview',
      'settings.languageLabel': 'Language',
      'settings.appearance.heading': 'Appearance',
      'settings.appearance.themeLabel': 'Theme',
      'settings.appearance.boardThemeLabel': 'Board colors',
      'settings.appearance.pieceSetLabel': 'Piece set',
      'settings.appearance.showCoordinatesLabel': 'Show board coordinates',
      'settings.appearance.boardAnimationsLabel': 'Animate piece moves',
      'settings.appearance.soundLabel': 'Sound effects',
      'settings.boardOrientation.heading': 'Board orientation',
      'settings.boardOrientation.auto': 'Auto',
      'settings.boardOrientation.white': 'White',
      'settings.boardOrientation.black': 'Black',
      'settings.resetToDefaults': 'Reset to Defaults',
      'settings.resetConfirm': "Reset all settings to their defaults? This can't be undone.",
    });
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('renders the title and subtitle', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('Settings');
    expect(el.querySelector('.subtitle')?.textContent).toContain('Personalize');
  });

  it('updates the theme preference through the store when a radio changes', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const store = TestBed.inject(PreferencesStoreService);

    const el: HTMLElement = fixture.nativeElement;
    const darkRadio = Array.from(
      el.querySelectorAll<HTMLInputElement>('input[name="theme"]'),
    ).find((r) => r.value === 'dark');
    darkRadio!.checked = true;
    darkRadio!.dispatchEvent(new Event('change'));

    expect(store.preferences().theme).toBe('dark');
  });

  it('toggles show_coordinates through the store', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const store = TestBed.inject(PreferencesStoreService);
    expect(store.preferences().show_coordinates).toBe(true);

    const el: HTMLElement = fixture.nativeElement;
    const checkbox = el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[0];
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));

    expect(store.preferences().show_coordinates).toBe(false);
  });

  it('resets preferences after confirming', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const store = TestBed.inject(PreferencesStoreService);
    const resetSpy = spyOn(store, 'reset');

    fixture.nativeElement.querySelector('.settings-section--footer button').click();

    expect(resetSpy).toHaveBeenCalled();
  });

  it('does not reset when the confirm dialog is dismissed', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const store = TestBed.inject(PreferencesStoreService);
    const resetSpy = spyOn(store, 'reset');

    fixture.nativeElement.querySelector('.settings-section--footer button').click();

    expect(resetSpy).not.toHaveBeenCalled();
  });

  it('navigates back to the dashboard by default', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl');

    fixture.nativeElement.querySelector('.settings-back-button').click();

    expect(navigateSpy).toHaveBeenCalledWith('/dashboard');
  });
});
