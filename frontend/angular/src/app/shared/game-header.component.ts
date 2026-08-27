import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameStatusService } from '../core/game-status.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';

/**
 * Angular counterpart of react/src/components/GameHeader.tsx — minimal header
 * (back button, live status text, settings gear) shown on training/puzzle
 * routes instead of HomeHeaderComponent.
 */
@Component({
  selector: 'app-game-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TranslatePipe],
  template: `
    <header class="game-header">
      <div class="game-header-inner">
        <button
          class="game-header-back"
          type="button"
          (click)="handleBack()"
          aria-label="Back"
          title="Back to dashboard"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div class="game-header-status">{{ gameStatus.status() }}</div>

        <button
          class="game-header-settings"
          type="button"
          (click)="handleSettings()"
          [attr.aria-label]="'header.settings' | translate"
          [attr.title]="'header.settings' | translate"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </header>
  `,
})
export class GameHeaderComponent {
  readonly gameStatus = inject(GameStatusService);
  private readonly router = inject(Router);

  handleBack(): void {
    this.router.navigate(['/dashboard']);
  }

  handleSettings(): void {
    const override = this.gameStatus.onSettingsClick();
    if (override) {
      override();
    } else {
      this.router.navigate(['/settings'], { state: { from: this.router.url } });
    }
  }
}
