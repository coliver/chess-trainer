import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Opening, OpeningsService } from '../../core/openings.service';
import { TrainingService } from '../../core/training.service';
import { ProgressService, ProgressSummary, WeakSpot } from '../../core/progress.service';
import { PuzzlesService, PuzzleSummary } from '../../core/puzzles.service';
import { baseNameOf, groupByBase, OpeningGroup, variationLabelOf } from '../../lib/group-openings';
import { describeOpening } from '../../lib/opening-text';
import { OpeningCardComponent } from './opening-card.component';
import { VariationListComponent } from './variation-list.component';
import { BoardPreviewComponent } from './board-preview.component';
import { ProgressStatComponent } from '../../shared/progress-stat.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslateService } from '../../core/i18n/translate.service';

const SEARCH_PAGE = 60;

/**
 * Angular dashboard — mirror of react/src/pages/Dashboard.tsx: a two-level
 * opening browser (base openings -> variations), a search view, and a
 * sticky preview panel that starts the training session.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    DecimalPipe,
    OpeningCardComponent,
    VariationListComponent,
    BoardPreviewComponent,
    ProgressStatComponent,
    TranslatePipe,
  ],
  template: `
    <main class="page">
      <div class="card">
        <section class="progress-overview" [attr.aria-label]="'dashboard.progress.yourProgress' | translate">
          <div class="progress-group" [attr.aria-label]="'dashboard.progress.trainingLabel' | translate">
            <h2 class="progress-group-label">{{ 'dashboard.progress.trainingHeading' | translate }}</h2>
            <div class="progress-group-row">
              <app-progress-stat icon="♟️" [label]="'dashboard.progress.positionsTrained' | translate">
                {{ summary?.positionsSeen ?? 0 }}
              </app-progress-stat>
              <app-progress-stat icon="🎯" [label]="'dashboard.progress.accuracy' | translate">
                {{ summary ? (summary.overallAccuracy * 100 | number: '1.0-0') + '%' : '—' }}
              </app-progress-stat>
              <app-progress-stat icon="📅" [label]="streakLabel()">
                {{ summary?.currentStreak ?? 0 }}{{ (summary?.currentStreak ?? 0) > 0 ? ' 🔥' : '' }}
              </app-progress-stat>
              <app-progress-stat icon="🏆" [label]="'dashboard.progress.mastered' | translate" variant="mastery">
                {{ summary?.mastered ?? 0 }}
                @if (summary && summary.positionsSeen > 0) {
                  <div stat-extra class="mastery-bar" aria-hidden="true">
                    <div class="mastery-bar-fill" [style.width.%]="masteryPct"></div>
                  </div>
                }
              </app-progress-stat>
              <div class="progress-stat">
                <button
                  type="button"
                  class="progress-review-btn"
                  [disabled]="dueCount === 0"
                  (click)="startReviewSession()"
                >
                  {{ 'dashboard.progress.reviewDue' | translate: { count: dueCount } }}
                </button>
              </div>
              @if (weakSpots.length > 0) {
                <div class="progress-weak-spots">
                  <span class="progress-stat-label">Weak spots</span>
                  <ul>
                    @for (w of weakSpots; track (w.openingName ?? 'Opening') + (w.fen ?? '') + (w.correctMoveUci ?? '')) {
                      <li>{{ w.openingName ?? 'Opening' }} — {{ w.correctCount }}/{{ w.attempts }} correct</li>
                    }
                  </ul>
                </div>
              }
            </div>
          </div>

          <div class="progress-group progress-group--puzzles" [attr.aria-label]="'dashboard.progress.puzzleLabel' | translate">
            <h2 class="progress-group-label">{{ 'dashboard.progress.puzzlesHeading' | translate }}</h2>
            <div class="progress-group-row">
              <app-progress-stat icon="🧩" [label]="'dashboard.progress.puzzlesSolved' | translate">
                {{ puzzleSummary?.puzzlesSeen ?? 0 }}
              </app-progress-stat>
              <app-progress-stat icon="🎯" [label]="'dashboard.progress.accuracy' | translate">
                {{
                  puzzleSummary
                    ? (puzzleSummary.overallAccuracy * 100 | number: '1.0-0') + '%'
                    : '—'
                }}
              </app-progress-stat>
              <app-progress-stat icon="🏆" [label]="'dashboard.progress.mastered' | translate">
                {{ puzzleSummary?.mastered ?? 0 }}
              </app-progress-stat>
              <div class="progress-stat">
                <button type="button" class="progress-review-btn" (click)="goToPuzzles()">
                  {{ 'dashboard.progress.practicePuzzles' | translate }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="opening-browser">
          <header class="ob-toolbar">
            <div class="ob-heading">
              <h1 class="ob-title">{{ 'dashboard.openings.title' | translate }}</h1>
              <p class="ob-sub">{{ subText }}</p>
            </div>
            <span class="ob-grow"></span>
            <div class="ob-search">
              <span class="ob-search-icon" aria-hidden="true">⌕</span>
              <input
                type="search"
                [attr.aria-label]="'dashboard.openings.searchAriaLabel' | translate"
                [placeholder]="'dashboard.openings.searchPlaceholder' | translate"
                autocomplete="off"
                [(ngModel)]="query"
                (ngModelChange)="onQueryChange()"
              />
            </div>
            @if (view === 'bases') {
              <button type="button" class="ob-sort" (click)="sortAZ = !sortAZ">
                {{ sortButtonLabel() }}
              </button>
            }
          </header>

          <div class="ob-body">
            <div class="ob-content">
              @if (view === 'search') {
                @if (searchMatches.length === 0) {
                  <div class="ob-noresults">
                    No openings match "{{ query.trim() }}".
                    <br />
                    Try a name (Sicilian) or an ECO code (B90).
                  </div>
                } @else {
                  <div class="variation-rows" role="list">
                    @for (o of shownSearchMatches; track o.eco + o.name) {
                      <button
                        type="button"
                        role="listitem"
                        class="variation-row"
                        [class.selected]="selected !== null && selected.eco + selected.name === o.eco + o.name"
                        [attr.aria-pressed]="selected !== null && selected.eco + selected.name === o.eco + o.name"
                        (click)="pickFromSearch(o)"
                      >
                        <span class="r-eco">{{ o.eco }}</span>
                        <span class="r-name">{{ o.name }}</span>
                      </button>
                    }
                  </div>
                  @if (searchMatches.length > searchLimit) {
                    <button type="button" class="ob-showmore" (click)="searchLimit = searchLimit + 60">
                      Show {{ searchMatches.length - searchLimit }} more
                    </button>
                  }
                }
              }

              @if (view === 'variations' && activeGroup) {
                <nav class="ob-crumbs" [attr.aria-label]="'dashboard.openings.breadcrumb' | translate">
                  <button type="button" (click)="goHome()">{{ 'dashboard.openings.allOpenings' | translate }}</button>
                  <span class="sep">/</span>
                  <span class="here">{{ activeGroup.base }}</span>
                </nav>
                <app-variation-list
                  [rows]="activeGroup.members"
                  [selectedKey]="selected ? selected.eco + selected.name : null"
                  (pick)="selected = $event"
                ></app-variation-list>
              }

              @if (view === 'bases') {
                <div class="opening-grid">
                  @for (g of sortedGroups; track g.base) {
                    <app-opening-card
                      [group]="g"
                      [selected]="selected !== null && baseNameOf(selected.name) === g.base"
                      (cardSelect)="openBase(g)"
                    ></app-opening-card>
                  }
                </div>
              }
            </div>

            <aside class="ob-preview" [class.is-empty]="!selected">
              @if (selected) {
                <div class="ob-preview-inner">
                  <app-board-preview
                    [openings]="[selected]"
                    [selectedOpeningName]="selected.name"
                  ></app-board-preview>
                  <h2 class="pv-title">{{ previewFullName }}</h2>
                  <p class="pv-eco">{{ selected.eco }}</p>
                  <p class="opening-description">{{ describeOpening(selected) }}</p>
                </div>
              } @else {
                <div class="ob-empty-state">
                  <span class="ob-empty-glyph" aria-hidden="true">♞</span>
                  <p class="opening-description opening-description--empty">
                    {{ 'dashboard.openings.pickToPreview' | translate }}
                  </p>
                </div>
              }

              <div class="ob-color-toggle" role="radiogroup" [attr.aria-label]="'dashboard.openings.playAs' | translate">
                <button
                  type="button"
                  role="radio"
                  [attr.aria-checked]="playerColor === 'w'"
                  class="ob-color-btn"
                  [class.selected]="playerColor === 'w'"
                  (click)="playerColor = 'w'"
                >
                  {{ 'dashboard.openings.playAsWhite' | translate }}
                </button>
                <button
                  type="button"
                  role="radio"
                  [attr.aria-checked]="playerColor === 'b'"
                  class="ob-color-btn"
                  [class.selected]="playerColor === 'b'"
                  (click)="playerColor = 'b'"
                >
                  {{ 'dashboard.openings.playAsBlack' | translate }}
                </button>
              </div>

              <button
                type="button"
                class="btn tile-action ob-start"
                [disabled]="!selected"
                (click)="selected && startSession(selected.eco, selected.name)"
              >
                {{ startLabel }}
              </button>
            </aside>
          </div>
        </section>
      </div>
    </main>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly openingsService = inject(OpeningsService);
  private readonly trainingService = inject(TrainingService);
  private readonly progressService = inject(ProgressService);
  private readonly puzzlesService = inject(PuzzlesService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  openings: Opening[] = [];
  query = '';
  activeBase: string | null = null;
  selected: Opening | null = null;
  playerColor: 'w' | 'b' = 'w';
  sortAZ = false;
  searchLimit = SEARCH_PAGE;

  summary: ProgressSummary | null = null;
  dueCount = 0;
  weakSpots: WeakSpot[] = [];
  puzzleSummary: PuzzleSummary | null = null;

  readonly baseNameOf = baseNameOf;
  readonly describeOpening = describeOpening;

  ngOnInit(): void {
    this.openingsService.getOpenings().subscribe({
      next: (data) => {
        this.openings = data ?? [];
        this.query = '';
        this.activeBase = null;
        this.selected = null;
      },
      error: (e) => console.error('Error loading openings:', e),
    });

    this.progressService.getSummary().subscribe({
      next: (data) => (this.summary = data ?? null),
      error: (e) => console.error('Error loading progress summary:', e),
    });
    this.progressService.getDue().subscribe({
      next: (data) => (this.dueCount = (data ?? []).length),
      error: (e) => console.error('Error loading due positions:', e),
    });
    this.progressService.getWeakSpots().subscribe({
      next: (data) => (this.weakSpots = (data ?? []).slice(0, 5)),
      error: (e) => console.error('Error loading weak spots:', e),
    });
    this.puzzlesService.getSummary().subscribe({
      next: (data) => (this.puzzleSummary = data ?? null),
      error: (e) => console.error('Error loading puzzle summary:', e),
    });
  }

  get masteryPct(): number {
    if (!this.summary || this.summary.positionsSeen === 0) return 0;
    return Math.min(100, Math.round((this.summary.mastered / this.summary.positionsSeen) * 100));
  }

  streakLabel(): string {
    return this.summary?.longestStreak
      ? this.translate.t('dashboard.progress.dayStreakBest', { best: this.summary.longestStreak })
      : this.translate.t('dashboard.progress.dayStreak');
  }

  sortButtonLabel(): string {
    const mode = this.translate.t(
      this.sortAZ ? 'dashboard.openings.sortAZ' : 'dashboard.openings.sortPopular',
    );
    return this.translate.t('dashboard.openings.sortButton', { mode });
  }

  goToPuzzles(): void {
    this.router.navigate(['/puzzles']);
  }

  startReviewSession(): void {
    this.trainingService.startFromDue().subscribe({
      next: (res) => this.router.navigate(['/training', res.id]),
      error: (err) => {
        console.error('Error starting review session:', err);
        alert(this.translate.t('dashboard.progress.reviewSessionFailed'));
      },
    });
  }

  get groups(): OpeningGroup[] {
    return groupByBase(this.openings);
  }

  get sortedGroups(): OpeningGroup[] {
    if (!this.sortAZ) return this.groups;
    return [...this.groups].sort((a, b) => a.base.localeCompare(b.base));
  }

  get activeGroup(): OpeningGroup | undefined {
    return this.groups.find((g) => g.base === this.activeBase);
  }

  private get q(): string {
    return this.query.trim().toLowerCase();
  }

  get searchMatches(): Opening[] {
    const q = this.q;
    if (!q) return [];
    return this.openings.filter(
      (o) => o.name.toLowerCase().includes(q) || o.eco.toLowerCase().includes(q),
    );
  }

  get shownSearchMatches(): Opening[] {
    return this.searchMatches.slice(0, this.searchLimit);
  }

  get view(): 'search' | 'variations' | 'bases' {
    if (this.q) return 'search';
    if (this.activeBase) return 'variations';
    return 'bases';
  }

  get subText(): string {
    if (this.view === 'search') {
      return this.translate.t('dashboard.openings.matches', { count: this.searchMatches.length });
    }
    if (this.view === 'variations' && this.activeGroup) {
      return this.translate.t('dashboard.openings.variationsInLibrary', {
        count: this.activeGroup.count,
      });
    }
    return this.translate.t('dashboard.openings.openingsToTrain', { count: this.groups.length });
  }

  get startLabel(): string {
    if (!this.selected) return this.translate.t('dashboard.openings.chooseOpening');
    const label =
      variationLabelOf(this.selected.name) === 'Main line'
        ? baseNameOf(this.selected.name)
        : variationLabelOf(this.selected.name);
    return this.translate.t('dashboard.openings.startLabel', { name: label });
  }

  get previewFullName(): string {
    if (!this.selected) return '';
    return variationLabelOf(this.selected.name) === 'Main line'
      ? baseNameOf(this.selected.name)
      : `${baseNameOf(this.selected.name)}: ${variationLabelOf(this.selected.name)}`;
  }

  onQueryChange(): void {
    this.searchLimit = SEARCH_PAGE;
  }

  openBase(group: OpeningGroup): void {
    this.activeBase = group.base;
    this.selected = group.representative;
  }

  pickFromSearch(o: Opening): void {
    this.selected = o;
    this.activeBase = baseNameOf(o.name);
  }

  goHome(): void {
    this.activeBase = null;
  }

  startSession(openingEco: string, openingName: string): void {
    this.trainingService.start(openingEco, openingName, this.playerColor).subscribe({
      next: (res) => this.router.navigate(['/training', res.id]),
      error: (err) => {
        console.error('Error starting session:', err);
        alert(this.translate.t('dashboard.progress.startSessionFailed'));
      },
    });
  }
}
