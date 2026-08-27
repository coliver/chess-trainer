import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PuzzlesService, ThemeCount } from '../../core/puzzles.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { BoardComponent } from '../training/board.component';
import { MATE_FENS, THEME_GROUPS, formatThemeLabel, themeIcon } from '../../lib/puzzle-themes';

interface ThemeGroupView {
  key: string;
  themes: string[];
}

/**
 * Angular counterpart of react/src/pages/PuzzleThemes.tsx — a grouped
 * browser over the theme tags puzzles are seen, linking each into
 * /puzzles?theme=<tag> (that query param isn't consumed by PuzzlesComponent
 * yet — a separate, still-open parity item).
 */
@Component({
  selector: 'app-puzzle-themes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterLink, TranslatePipe, BoardComponent],
  template: `
    <main class="page">
      <div class="card">
        <div class="puzzle-themes-head">
          <div class="rail-eyebrow">{{ 'puzzleThemes.eyebrow' | translate }}</div>
          <h1>{{ 'puzzleThemes.title' | translate }}</h1>
          <p class="puzzle-themes-subtitle">{{ 'puzzleThemes.subtitle' | translate }}</p>
          <button type="button" class="puzzle-themes-random-btn" (click)="goToRandomPuzzle()">
            {{ 'puzzleThemes.randomPuzzle' | translate }}
          </button>
        </div>

        @for (group of visibleGroups(); track group.key) {
          <section class="puzzle-theme-group">
            <h2 class="puzzle-theme-group-title">{{ ('puzzleThemes.' + group.key) | translate }}</h2>
            <div class="puzzle-theme-grid">
              @for (theme of group.themes; track theme) {
                <a [routerLink]="['/puzzles']" [queryParams]="{ theme }" class="puzzle-theme-card">
                  @if (mateFens[theme]; as mateFen) {
                    <div class="puzzle-theme-card-board" aria-hidden="true">
                      <app-board [position]="mateFen" [interactive]="false" />
                    </div>
                  } @else {
                    <span class="puzzle-theme-card-icon" aria-hidden="true">{{ themeIcon(theme) }}</span>
                  }
                  <span class="puzzle-theme-card-name">{{ formatThemeLabel(theme) }}</span>
                  <span class="puzzle-theme-card-count">
                    {{ 'puzzleThemes.cardCount' | translate: { count: countByTheme().get(theme) ?? 0 } }}
                  </span>
                </a>
              }
            </div>
          </section>
        }
      </div>
    </main>
  `,
})
export class PuzzleThemesComponent {
  private readonly puzzles = inject(PuzzlesService);
  private readonly router = inject(Router);

  readonly mateFens = MATE_FENS;
  readonly formatThemeLabel = formatThemeLabel;
  readonly themeIcon = themeIcon;

  private readonly themeCounts = signal<ThemeCount[]>([]);

  readonly countByTheme = () => new Map(this.themeCounts().map((tc) => [tc.theme, tc.count]));

  readonly visibleGroups = (): ThemeGroupView[] => {
    const counted = this.countByTheme();
    return THEME_GROUPS.map((group) => ({
      key: group.key,
      themes: group.themes.filter((theme) => counted.has(theme)),
    })).filter((group) => group.themes.length > 0);
  };

  constructor() {
    this.puzzles.themes().subscribe({
      next: (counts) => this.themeCounts.set(counts),
      error: () => undefined,
    });
  }

  goToRandomPuzzle(): void {
    this.router.navigate(['/puzzles']);
  }
}
