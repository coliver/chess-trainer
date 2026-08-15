import { Component, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Opening, OpeningsService } from '../../core/openings.service';
import { TrainingService } from '../../core/training.service';
import { ProgressService, ProgressSummary, WeakSpot } from '../../core/progress.service';
import { baseNameOf, groupByBase, OpeningGroup, variationLabelOf } from '../../lib/group-openings';
import { describeOpening } from '../../lib/opening-text';
import { OpeningCardComponent } from './opening-card.component';
import { VariationListComponent } from './variation-list.component';
import { BoardPreviewComponent } from './board-preview.component';

const SEARCH_PAGE = 60;

/**
 * Angular dashboard — mirror of react/src/pages/Dashboard.tsx: a two-level
 * opening browser (base openings -> variations), a search view, and a
 * sticky preview panel that starts the training session.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, DecimalPipe, OpeningCardComponent, VariationListComponent, BoardPreviewComponent],
  template: `
    <main class="page">
      <div class="card">
        <section class="progress-strip" aria-label="Training progress">
          <div class="progress-stat">
            <span class="progress-stat-value">{{ summary?.positionsSeen ?? 0 }}</span>
            <span class="progress-stat-label">Positions trained</span>
          </div>
          <div class="progress-stat">
            <span class="progress-stat-value">
              {{ summary ? (summary.overallAccuracy * 100 | number: '1.0-0') + '%' : '—' }}
            </span>
            <span class="progress-stat-label">Accuracy</span>
          </div>
          <div class="progress-stat">
            <span class="progress-stat-value">
              {{ summary?.currentStreak ?? 0 }}{{ (summary?.currentStreak ?? 0) > 0 ? ' 🔥' : '' }}
            </span>
            <span class="progress-stat-label">
              Day streak{{ summary?.longestStreak ? ' · best ' + summary!.longestStreak : '' }}
            </span>
          </div>
          <div class="progress-stat progress-stat--mastery">
            <span class="progress-stat-value">{{ summary?.mastered ?? 0 }}</span>
            <span class="progress-stat-label">Mastered</span>
            @if (summary && summary.positionsSeen > 0) {
              <div class="mastery-bar" aria-hidden="true">
                <div
                  class="mastery-bar-fill"
                  [style.width.%]="masteryPct"
                ></div>
              </div>
            }
          </div>
          <div class="progress-stat">
            <button
              type="button"
              class="progress-review-btn"
              [disabled]="dueCount === 0"
              (click)="startReviewSession()"
            >
              Review due ({{ dueCount }})
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
        </section>

        <section class="opening-browser">
          <header class="ob-toolbar">
            <div class="ob-heading">
              <h1 class="ob-title">Openings</h1>
              <p class="ob-sub">{{ subText }}</p>
            </div>
            <span class="ob-grow"></span>
            <div class="ob-search">
              <span class="ob-search-icon" aria-hidden="true">⌕</span>
              <input
                type="search"
                aria-label="Search openings"
                placeholder="Search openings or ECO…"
                autocomplete="off"
                [(ngModel)]="query"
                (ngModelChange)="onQueryChange()"
              />
            </div>
            @if (view === 'bases') {
              <button type="button" class="ob-sort" (click)="sortAZ = !sortAZ">
                Sort: {{ sortAZ ? 'A–Z' : 'Popular' }}
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
                        [class.selected]="selected?.name === o.name"
                        [attr.aria-pressed]="selected?.name === o.name"
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
                <nav class="ob-crumbs" aria-label="Breadcrumb">
                  <button type="button" (click)="goHome()">All openings</button>
                  <span class="sep">/</span>
                  <span class="here">{{ activeGroup.base }}</span>
                </nav>
                <app-variation-list
                  [rows]="activeGroup.members"
                  [selectedName]="selected?.name ?? null"
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
                    Pick an opening to preview the line and start training.
                  </p>
                </div>
              }

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
  private readonly router = inject(Router);

  openings: Opening[] = [];
  query = '';
  activeBase: string | null = null;
  selected: Opening | null = null;
  sortAZ = false;
  searchLimit = SEARCH_PAGE;

  summary: ProgressSummary | null = null;
  dueCount = 0;
  weakSpots: WeakSpot[] = [];

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
  }

  get masteryPct(): number {
    if (!this.summary || this.summary.positionsSeen === 0) return 0;
    return Math.min(100, Math.round((this.summary.mastered / this.summary.positionsSeen) * 100));
  }

  startReviewSession(): void {
    this.trainingService.startFromDue().subscribe({
      next: (res) => this.router.navigate(['/training', res.id]),
      error: (err) => {
        console.error('Error starting review session:', err);
        alert('No positions due for review yet.');
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
      const n = this.searchMatches.length;
      return `${n} match${n === 1 ? '' : 'es'}`;
    }
    if (this.view === 'variations' && this.activeGroup) {
      return `${this.activeGroup.count} variations in the full library`;
    }
    return `${this.groups.length} openings · pick one to train`;
  }

  get startLabel(): string {
    if (!this.selected) return 'Choose an opening';
    const label =
      variationLabelOf(this.selected.name) === 'Main line'
        ? baseNameOf(this.selected.name)
        : variationLabelOf(this.selected.name);
    return `Start ${label}`;
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
    this.trainingService.start(openingEco, openingName).subscribe({
      next: (res) => this.router.navigate(['/training', res.id]),
      error: (err) => {
        console.error('Error starting session:', err);
        alert('Failed to start session. Check your connection or token.');
      },
    });
  }
}
