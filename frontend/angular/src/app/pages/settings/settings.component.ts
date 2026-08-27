import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { applyMove, legalMoves, START_FEN } from '@knight-school/chess-core';
import { PreferencesStoreService } from '../../core/preferences-store.service';
import { TranslateService } from '../../core/i18n/translate.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { BoardComponent } from '../training/board.component';
import { LanguageToggleComponent } from '../../shared/language-toggle.component';
import { SettingsToggleRowComponent } from '../../shared/settings-toggle-row.component';
import {
  SettingsRadioGroupComponent,
  SettingsRadioOption,
} from '../../shared/settings-radio-group.component';
import { BoardOrientationMode, BoardTheme, PieceSet, Theme } from '../../core/preferences';

const THEMES: Theme[] = ['light', 'dark', 'system'];
const BOARD_THEMES: BoardTheme[] = [
  'default',
  'default-contrast',
  'green',
  'blue',
  'chess-club',
  'chessboard-js',
  'black-and-white',
];
const PIECE_SETS: PieceSet[] = ['standard', 'staunty', 'merida', 'pirouetti', 'chessnut'];
const ORIENTATION_MODES: BoardOrientationMode[] = ['auto', 'white', 'black'];

/**
 * Angular counterpart of react/src/pages/Settings.tsx. Sound-on-preview-move
 * isn't wired up (react/src/hooks/useSound.ts / utils/sound.ts aren't ported
 * yet — separate PARITY_GAPS.md item) but everything else — appearance,
 * board orientation, live interactive preview, reset — is.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    TranslatePipe,
    BoardComponent,
    LanguageToggleComponent,
    SettingsToggleRowComponent,
    SettingsRadioGroupComponent,
  ],
  template: `
    <main class="page">
      <div class="card settings-card">
        <button
          type="button"
          class="settings-back-button"
          (click)="goBack()"
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <h1 class="title">{{ 'settings.title' | translate }}</h1>
        <p class="subtitle">{{ 'settings.subtitle' | translate }}</p>

        <section class="settings-section settings-section--preview">
          <span class="settings-row-label">{{ 'settings.previewLabel' | translate }}</span>
          <div class="settings-preview-board">
            <app-board
              [position]="previewFen"
              [orientation]="preferences().board_orientation_mode === 'black' ? 'black' : 'white'"
              [interactive]="true"
              [moveColor]="previewMoveColor()"
              [getLegalMoves]="previewGetLegalMoves"
              [onMove]="previewOnMove"
            />
          </div>
        </section>

        <section class="settings-section">
          <div class="settings-row">
            <span class="settings-row-label">{{ 'settings.languageLabel' | translate }}</span>
            <app-language-toggle />
          </div>
        </section>

        <section class="settings-section">
          <h2 class="settings-section-heading">{{ 'settings.appearance.heading' | translate }}</h2>

          <app-settings-radio-group
            name="theme"
            [ariaLabel]="'settings.appearance.themeLabel' | translate"
            [rowLabel]="'settings.appearance.themeLabel' | translate"
            [value]="preferences().theme"
            [options]="themeOptions()"
            (valueChange)="update({ theme: $any($event) })"
          />

          <label class="settings-row" for="settings-board-theme">
            <span class="settings-row-label">{{ 'settings.appearance.boardThemeLabel' | translate }}</span>
            <select
              id="settings-board-theme"
              class="text-input settings-select"
              [value]="preferences().board_theme"
              (change)="update({ board_theme: $any($event.target).value })"
            >
              @for (boardTheme of boardThemes; track boardTheme) {
                <option [value]="boardTheme">{{ ('settings.boardThemes.' + boardTheme) | translate }}</option>
              }
            </select>
          </label>

          <label class="settings-row" for="settings-piece-set">
            <span class="settings-row-label">{{ 'settings.appearance.pieceSetLabel' | translate }}</span>
            <select
              id="settings-piece-set"
              class="text-input settings-select"
              [value]="preferences().piece_set"
              (change)="update({ piece_set: $any($event.target).value })"
            >
              @for (pieceSet of pieceSets; track pieceSet) {
                <option [value]="pieceSet">{{ ('settings.pieceSets.' + pieceSet) | translate }}</option>
              }
            </select>
          </label>

          <app-settings-toggle-row
            [label]="'settings.appearance.showCoordinatesLabel' | translate"
            [checked]="preferences().show_coordinates"
            (checkedChange)="update({ show_coordinates: $event })"
          />

          <app-settings-toggle-row
            [label]="'settings.appearance.boardAnimationsLabel' | translate"
            [checked]="preferences().board_animations"
            (checkedChange)="update({ board_animations: $event })"
          />

          <app-settings-toggle-row
            [label]="'settings.appearance.soundLabel' | translate"
            [checked]="preferences().sound"
            (checkedChange)="update({ sound: $event })"
          />
        </section>

        <section class="settings-section">
          <h2 class="settings-section-heading">{{ 'settings.boardOrientation.heading' | translate }}</h2>
          <app-settings-radio-group
            name="board-orientation-mode"
            [ariaLabel]="'settings.boardOrientation.heading' | translate"
            [stacked]="true"
            [value]="preferences().board_orientation_mode"
            [options]="orientationOptions()"
            (valueChange)="update({ board_orientation_mode: $any($event) })"
          />
        </section>

        <section class="settings-section settings-section--footer">
          <button type="button" class="btn btn-secondary" (click)="handleReset()">
            {{ 'settings.resetToDefaults' | translate }}
          </button>
        </section>
      </div>
    </main>
  `,
})
export class SettingsComponent {
  private readonly router = inject(Router);
  private readonly store = inject(PreferencesStoreService);
  private readonly translate = inject(TranslateService);

  readonly preferences = this.store.preferences;
  readonly boardThemes = BOARD_THEMES;
  readonly pieceSets = PIECE_SETS;

  previewFen = START_FEN;

  readonly previewGetLegalMoves = (square: string) => legalMoves(this.previewFen, square);

  readonly previewOnMove = (from: string, to: string): boolean => {
    if (!from || !to || from === to) return false;
    const result = applyMove(this.previewFen, from, to, `${from}${to}q`);
    if (!result) return false;
    this.previewFen = result.nextFen;
    return true;
  };

  previewMoveColor(): 'white' | 'black' {
    return this.previewFen.split(' ')[1] === 'b' ? 'black' : 'white';
  }

  themeOptions(): SettingsRadioOption[] {
    return THEMES.map((theme) => ({ value: theme, label: this.translate.t(`theme.${theme}`) }));
  }

  orientationOptions(): SettingsRadioOption[] {
    return ORIENTATION_MODES.map((mode) => ({
      value: mode,
      label: this.translate.t(`settings.boardOrientation.${mode}`),
    }));
  }

  update(partial: Parameters<PreferencesStoreService['update']>[0]): void {
    this.store.update(partial);
  }

  handleReset(): void {
    if (!window.confirm(this.translate.t('settings.resetConfirm'))) return;
    this.store.reset();
  }

  goBack(): void {
    const from = (history.state as { from?: string } | null)?.from ?? '/dashboard';
    this.router.navigateByUrl(from);
  }
}
