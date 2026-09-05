import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Opening, OpeningsService } from '../../core/openings.service';
import { TrainingService } from '../../core/training.service';
import {
  CommonWrongMove,
  ProgressService,
  ProgressSummary,
  StepAccuracy,
  WeakSpot,
} from '../../core/progress.service';
import { PuzzlesService, PuzzleSummary } from '../../core/puzzles.service';
import { AuthService } from '../../core/auth.service';
import { baseNameOf, colorOf, groupByBase, OpeningGroup, variationLabelOf } from '../../lib/group-openings';
import { describeOpening } from '../../lib/opening-text';
import { OpeningCardComponent } from './opening-card.component';
import { VariationListComponent } from './variation-list.component';
import { BoardPreviewComponent } from './board-preview.component';
import { ProgressStatComponent } from '../../shared/progress-stat.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslateService } from '../../core/i18n/translate.service';

const SEARCH_PAGE = 60;
const BASES_PAGE = 12;
const CAROUSEL_SIZE = 8;

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
      <div class="dashboard-stack">
        <div role="heading" aria-level="1" class="dashboard-greeting">
          {{ greeting.before }}
          @if (greeting.emoji) {
            <span class="dashboard-greeting-emoji"> {{ greeting.emoji }}</span>
          }
          {{ greeting.who }}
        </div>
        <div class="card">
          <div class="stat-tabs" role="tablist" [attr.aria-label]="'dashboard.progress.yourProgress' | translate">
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="mobileStatTab === 'training'"
              class="stat-tab"
              [class.active]="mobileStatTab === 'training'"
              (click)="mobileStatTab = 'training'"
            >
              {{ 'dashboard.progress.trainingHeading' | translate }}
            </button>
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="mobileStatTab === 'puzzles'"
              class="stat-tab"
              [class.active]="mobileStatTab === 'puzzles'"
              (click)="mobileStatTab = 'puzzles'"
            >
              {{ 'dashboard.progress.puzzlesHeading' | translate }}
            </button>
          </div>
          <section
            class="progress-overview"
            [attr.aria-label]="'dashboard.progress.yourProgress' | translate"
            [attr.data-mobile-tab]="mobileStatTab"
          >
            <div class="progress-group progress-group--training" [attr.aria-label]="'dashboard.progress.trainingLabel' | translate">
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
              </div>

              @if (weakSpots.length > 0 || troubleSteps.length > 0) {
                <div class="ws-container">
                  <div class="ws-grid">
                    @if (weakSpots.length > 0) {
                      <div class="ws-tile" role="group" [attr.aria-label]="'dashboard.progress.weakestOpening' | translate">
                        <span class="ws-label">{{ 'dashboard.progress.weakestOpening' | translate }}</span>
                        <span class="ws-title" [title]="weakSpotName(weakSpots[0])">{{ weakSpotName(weakSpots[0]) }}</span>
                        <div class="ws-stat">
                          <span class="ws-value">{{ weakSpotPct(weakSpots[0]) }}%</span>
                          <span class="ws-stat-label">{{ 'dashboard.progress.accuracy' | translate }}</span>
                        </div>
                      </div>
                    }
                    @if (troubleSteps.length > 0) {
                      <div class="ws-tile" role="group" [attr.aria-label]="'dashboard.progress.trickiestMove' | translate">
                        <span class="ws-label">{{ 'dashboard.progress.trickiestMove' | translate }}</span>
                        <span class="ws-title" [title]="troubleStepTitle(troubleSteps[0])">{{ troubleStepTitle(troubleSteps[0]) }}</span>
                        <div class="ws-stat">
                          <span class="ws-value">{{ troubleStepPct(troubleSteps[0]) }}%</span>
                          <span class="ws-stat-label">{{ troubleStepStatLabel(troubleSteps[0]) }}</span>
                        </div>
                      </div>
                    }
                  </div>

                  @if (weakSpots.length > 1 || troubleSteps.length > 1) {
                    <div class="ws-footer">
                      <button
                        type="button"
                        class="ws-link"
                        [attr.aria-expanded]="needsWorkExpanded"
                        (click)="needsWorkExpanded = !needsWorkExpanded"
                      >
                        {{ needsWorkExpanded ? ('dashboard.progress.seeLess' | translate) : seeAllLabel() }}
                      </button>
                    </div>
                  }

                  @if (needsWorkExpanded) {
                    <div class="ws-expanded">
                      @for (w of weakSpots.slice(1); track weakSpotKey(w)) {
                        <div class="ws-row">
                          <div class="ws-row-main">
                            <span class="ws-row-name" [title]="weakSpotName(w)">{{ weakSpotName(w) }}</span>
                            <span class="ws-row-sub">{{ 'dashboard.progress.wholeOpening' | translate }}</span>
                          </div>
                          <span class="ws-row-pct">{{ weakSpotPct(w) }}%</span>
                        </div>
                      }
                      @for (s of troubleSteps.slice(1); track troubleStepKey(s)) {
                        <div class="ws-row">
                          <div class="ws-row-main">
                            <span class="ws-row-name" [title]="troubleStepName(s)">{{ troubleStepName(s) }}</span>
                            <span class="ws-row-sub">{{ troubleStepRowSub(s) }}</span>
                          </div>
                          <span class="ws-row-pct">{{ troubleStepPct(s) }}%</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
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
                <div class="ob-color-filter" role="radiogroup" [attr.aria-label]="'dashboard.openings.filterByColor' | translate">
                  <button
                    type="button"
                    role="radio"
                    [attr.aria-checked]="colorFilter === 'all'"
                    class="ob-color-filter-btn"
                    [class.selected]="colorFilter === 'all'"
                    (click)="colorFilter = 'all'"
                  >
                    {{ 'dashboard.openings.all' | translate }}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    [attr.aria-checked]="colorFilter === 'w'"
                    class="ob-color-filter-btn"
                    [class.selected]="colorFilter === 'w'"
                    (click)="colorFilter = 'w'"
                  >
                    {{ 'dashboard.openings.white' | translate }}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    [attr.aria-checked]="colorFilter === 'b'"
                    class="ob-color-filter-btn"
                    [class.selected]="colorFilter === 'b'"
                    (click)="colorFilter = 'b'"
                  >
                    {{ 'dashboard.openings.black' | translate }}
                  </button>
                </div>
              }
            </header>

            @if (view === 'bases' && showCarousel) {
              <div class="ob-carousel-section">
                <h2 class="ob-carousel-heading">{{ 'dashboard.openings.popularHeading' | translate }}</h2>
                <div class="opening-carousel">
                  @for (g of carouselGroups; track g.base) {
                    <app-opening-card
                      [group]="g"
                      [selected]="selected !== null && baseNameOf(selected.name) === g.base"
                      (cardSelect)="openBase(g)"
                    ></app-opening-card>
                  }
                </div>
              </div>
            }

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
                    @for (g of gridGroups; track g.base) {
                      <app-opening-card
                        [group]="g"
                        [selected]="selected !== null && baseNameOf(selected.name) === g.base"
                        (cardSelect)="openBase(g)"
                      ></app-opening-card>
                    }
                  </div>
                  @if (gridRemaining > 0) {
                    <button type="button" class="ob-showmore" (click)="showMoreGrid()">
                      {{ 'dashboard.openings.showMore' | translate: { count: gridRemaining } }}
                    </button>
                  }
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
      </div>
    </main>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly openingsService = inject(OpeningsService);
  private readonly trainingService = inject(TrainingService);
  private readonly progressService = inject(ProgressService);
  private readonly puzzlesService = inject(PuzzlesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  openings: Opening[] = [];
  needsWorkExpanded = false;
  query = '';
  activeBase: string | null = null;
  selected: Opening | null = null;
  playerColor: 'w' | 'b' = 'w';
  sortAZ = false;
  colorFilter: 'all' | 'w' | 'b' = 'all';
  searchLimit = SEARCH_PAGE;
  gridLimit = BASES_PAGE;
  mobileStatTab: 'training' | 'puzzles' = 'training';

  summary: ProgressSummary | null = null;
  dueCount = 0;
  weakSpots: WeakSpot[] = [];
  troubleSteps: StepAccuracy[] = [];
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
    this.progressService.getStepAccuracy().subscribe({
      next: (data) => (this.troubleSteps = (data ?? []).slice(0, 5)),
      error: (e) => console.error('Error loading step accuracy:', e),
    });
    this.puzzlesService.getSummary().subscribe({
      next: (data) => (this.puzzleSummary = data ?? null),
      error: (e) => console.error('Error loading puzzle summary:', e),
    });
  }

  get greeting(): { before: string; emoji: string; who: string } {
    const hour = new Date().getHours();
    const base =
      hour < 12
        ? this.translate.t('header.greetingMorning')
        : hour < 18
          ? this.translate.t('header.greetingAfternoon')
          : this.translate.t('header.greetingEvening');
    const username = this.authService.username;
    const who = username ? `, ${username}` : '';
    const match = base.match(/(\p{Extended_Pictographic}️?)\s*$/u);
    if (!match || match.index === undefined) {
      return { before: `${base}${who}`, emoji: '', who: '' };
    }
    return {
      before: base.slice(0, match.index).trimEnd(),
      emoji: match[1],
      who,
    };
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

  weakSpotName(w: WeakSpot): string {
    return w.openingName ?? this.translate.t('dashboard.progress.weakSpotFallbackName');
  }

  weakSpotPct(w: WeakSpot): number {
    return w.attempts > 0 ? Math.round((w.correctCount / w.attempts) * 100) : 0;
  }

  weakSpotKey(w: WeakSpot): string {
    return `${w.openingName ?? 'Opening'}-${w.fen ?? ''}-${w.correctMoveUci ?? ''}`;
  }

  troubleStepName(s: StepAccuracy): string {
    return s.openingName ?? this.translate.t('dashboard.progress.weakSpotFallbackName');
  }

  troubleStepMoveNumber(s: StepAccuracy): number {
    return Math.floor(s.orderIndex / 2) + 1;
  }

  troubleStepPct(s: StepAccuracy): number {
    return Math.round(s.accuracy * 100);
  }

  troubleStepTopWrongMove(s: StepAccuracy): CommonWrongMove | undefined {
    return s.commonWrongMoves[0];
  }

  troubleStepTitle(s: StepAccuracy): string {
    return `${this.troubleStepName(s)} · ${this.translate.t('dashboard.progress.moveAbbrev', { move: this.troubleStepMoveNumber(s) })}`;
  }

  troubleStepStatLabel(s: StepAccuracy): string {
    const top = this.troubleStepTopWrongMove(s);
    return top
      ? this.translate.t('dashboard.progress.troubleSpotWrongMoveShort', { move: top.moveUci })
      : this.translate.t('dashboard.progress.accuracy');
  }

  troubleStepRowSub(s: StepAccuracy): string {
    const top = this.troubleStepTopWrongMove(s);
    const move = this.troubleStepMoveNumber(s);
    return top
      ? this.translate.t('dashboard.progress.troubleSpotItemWithWrongMove', { move, wrongMove: top.moveUci })
      : this.translate.t('dashboard.progress.moveAbbrev', { move });
  }

  troubleStepKey(s: StepAccuracy): string {
    return `${s.openingName ?? 'Opening'}-${s.openingEco ?? ''}-${s.orderIndex}`;
  }

  seeAllLabel(): string {
    return this.translate.t('dashboard.progress.seeAllWeakSpots', {
      count: this.weakSpots.length + this.troubleSteps.length,
    });
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

  get colorFilteredGroups(): OpeningGroup[] {
    return this.sortedGroups.filter(
      (g) => this.colorFilter === 'all' || colorOf(g.base) === this.colorFilter,
    );
  }

  get showCarousel(): boolean {
    return this.colorFilteredGroups.length > BASES_PAGE;
  }

  get carouselGroups(): OpeningGroup[] {
    return this.colorFilteredGroups.slice(0, CAROUSEL_SIZE);
  }

  get gridStart(): number {
    return this.showCarousel ? CAROUSEL_SIZE : 0;
  }

  get gridGroups(): OpeningGroup[] {
    return this.colorFilteredGroups.slice(this.gridStart, this.gridStart + this.gridLimit);
  }

  get gridRemaining(): number {
    return this.colorFilteredGroups.length - this.gridStart - this.gridLimit;
  }

  showMoreGrid(): void {
    this.gridLimit += BASES_PAGE;
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
    return this.translate.t('dashboard.openings.openingsToTrain', {
      count: this.colorFilteredGroups.length,
    });
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
