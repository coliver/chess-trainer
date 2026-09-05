import { Component, ChangeDetectionStrategy, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  START_FEN,
  applyMove,
  deriveHintMarkers,
  legalMoves,
  pieceColorAt,
  sideToMove,
} from '@knight-school/chess-core';
import { BoardArrow, BoardComponent, BoardMarker } from '../training/board.component';
import { FlipBoardButtonComponent } from '../../shared/flip-board-button.component';
import { NextPuzzle, PuzzlesService } from '../../core/puzzles.service';
import { SoundService } from '../../core/sound.service';
import { celebratePuzzleCorrect } from '../../lib/win-celebration';
import { TranslateService } from '../../core/i18n/translate.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

interface HistoryEntry {
  puzzle: NextPuzzle;
  solved: boolean;
  usedHint: boolean;
  finalFen: string;
  finalLastMoveUci: string;
}

/**
 * Angular puzzles page — mirror of react/src/pages/Puzzles.tsx: loads the
 * next due puzzle, lets the user drag a move on the board (or it snaps back
 * on a wrong answer), and tracks a solved count plus a current/best streak
 * with a Skip control so a stuck user isn't stranded.
 *
 * Also mirrors React's session-local history: every puzzle fetched this
 * session is kept in `history`, `historyIndex` can step backward through it
 * (read-only replay of a past puzzle's final position), and a hint button
 * escalates through two levels (dot -> arrow), auto-escalating after enough
 * wrong attempts. Clicking hint at all sets a sticky per-puzzle `usedHint`
 * flag sent with every attempt on that puzzle.
 */
@Component({
  selector: 'app-puzzles',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [BoardComponent, FlipBoardButtonComponent, RouterLink, TranslatePipe],
  template: `
    <main class="page">
      <div class="card puzzles-card">
        <header class="puzzles-header">
          <h1>{{ 'puzzles.title' | translate }}</h1>
          <div class="puzzles-meta">
            @if (displayRating !== null) {
              <span>{{ 'puzzles.rating' | translate: { rating: displayRating } }}</span>
            }
            @if (displaySolverMovesTotal > 1) {
              <span>{{
                'puzzles.moveProgress'
                  | translate: { current: displayMoveIndex + 1, total: displaySolverMovesTotal }
              }}</span>
            }
            <span>{{ 'puzzles.solved' | translate: { count: solved } }}</span>
            <span class="puzzles-streak" [class.is-active]="streak > 0">
              {{ 'puzzles.streak' | translate: { count: streak } }}{{ streak > 0 ? ' 🔥' : '' }}{{
                bestStreak > 0 ? ('puzzles.streakBest' | translate: { best: bestStreak }) : ''
              }}
            </span>
          </div>
        </header>

        <div class="puzzles-board-wrap">
          <app-board
            [position]="displayFen"
            [orientation]="orientation"
            [interactive]="!viewingPast && !!puzzleId && !isSubmitting && !puzzleComplete"
            [moveColor]="solverColor === 'b' ? 'black' : 'white'"
            [markers]="markers"
            [arrows]="arrows"
            [getLegalMoves]="getLegalMoves"
            [onMoveStart]="onMoveStart"
            [onMove]="onMove"
          ></app-board>
        </div>
        <div class="board-under">
          <span class="turn" [class.black]="solverColor === 'b'">
            <span class="turn-dot" aria-hidden="true"></span>
            {{ (solverColor === 'b' ? 'training.blackToMove' : 'training.whiteToMove') | translate }}
          </span>
          <div class="board-toolbar">
            <app-flip-board-button class="icon-btn" (flip)="flipBoard()" />
            @if (historyIndex > 0) {
              <button
                type="button"
                class="icon-btn"
                (click)="goToPrev()"
                [attr.aria-label]="'puzzles.previousPuzzle' | translate"
                [attr.title]="'puzzles.previousPuzzle' | translate"
              >
                <span aria-hidden="true">⏮</span>
              </button>
            }
            @if (!viewingPast) {
              <button
                type="button"
                class="icon-btn hint-icon"
                (click)="showHint()"
                [disabled]="!puzzleId || isSubmitting || puzzleComplete"
                [attr.aria-label]="'puzzles.showHint' | translate"
                [attr.title]="'puzzles.showHint' | translate"
              >
                <span aria-hidden="true">💡</span>
              </button>
            }
            @if (puzzleId && !puzzleComplete) {
              <button
                type="button"
                class="icon-btn"
                (click)="skip()"
                [disabled]="isSubmitting"
                [attr.aria-label]="'puzzles.skipPuzzle' | translate"
                [attr.title]="'puzzles.skipPuzzle' | translate"
              >
                <span aria-hidden="true">⏭</span>
              </button>
            }
          </div>
        </div>

        <p class="puzzles-feedback" role="status">
          {{ viewingPast ? '' : feedback || (puzzleId ? findBestMoveHint() : '') }}
        </p>

        @if ((puzzleId && puzzleComplete) || viewingPast) {
          <button #nextBtn type="button" class="puzzles-next" (click)="goToNext()">
            {{ 'puzzles.nextPuzzle' | translate }}
          </button>
        }

        @if (noPuzzlesDue) {
          <a routerLink="/dashboard" class="puzzles-back-link">{{
            'puzzles.backToDashboard' | translate
          }}</a>
        }
      </div>
    </main>
  `,
})
export class PuzzlesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly puzzles = inject(PuzzlesService);
  private readonly sound = inject(SoundService);
  private readonly translate = inject(TranslateService);

  @ViewChild('nextBtn') nextBtnRef?: ElementRef<HTMLButtonElement>;

  history: HistoryEntry[] = [];
  historyIndex = -1;
  frontierExhausted = false;

  fen = START_FEN;
  correctMoveUci = '';
  rating: number | null = null;
  moveIndex = 0;
  solverMovesTotal = 1;
  lastMoveUci = '';

  feedback = '';
  isSubmitting = false;
  solved = 0;
  streak = 0;
  bestStreak = 0;
  noPuzzlesDue = false;
  puzzleComplete = false;
  orientation: 'white' | 'black' = 'white';
  markers: BoardMarker[] = [];
  arrows: BoardArrow[] = [];

  hintLevel = -1;
  wrongAttempts = 0;
  private usedHint = false;

  readonly onMove = (from: string, to: string): boolean => this.processMove(from, to);
  readonly onMoveStart = (square: string): boolean => this.canPickUp(square);
  readonly getLegalMoves = (square: string) => legalMoves(this.fen, square);

  get atFrontier(): boolean {
    return this.historyIndex === this.history.length - 1;
  }

  get viewingPast(): boolean {
    return !this.atFrontier && this.historyIndex >= 0;
  }

  get currentEntry(): HistoryEntry | null {
    return this.viewingPast ? (this.history[this.historyIndex] ?? null) : null;
  }

  get puzzleId(): string | null {
    if (this.frontierExhausted || !this.atFrontier || this.puzzleComplete) return null;
    return this.history[this.historyIndex]?.puzzle.puzzleId ?? null;
  }

  get effectiveHintLevel(): number {
    const attemptFloor = this.wrongAttempts >= 4 ? 1 : this.wrongAttempts >= 2 ? 0 : -1;
    return Math.max(this.hintLevel, attemptFloor);
  }

  get displayFen(): string {
    return this.viewingPast ? (this.currentEntry?.finalFen ?? this.fen) : this.fen;
  }

  get displayRating(): number | null {
    return this.viewingPast ? (this.currentEntry?.puzzle.rating ?? null) : this.rating;
  }

  get displayMoveIndex(): number {
    return this.viewingPast ? (this.currentEntry?.puzzle.moveIndex ?? 0) : this.moveIndex;
  }

  get displaySolverMovesTotal(): number {
    return this.viewingPast ? (this.currentEntry?.puzzle.solverMovesTotal ?? 1) : this.solverMovesTotal;
  }

  get solverColor(): string {
    return sideToMove(this.viewingPast ? (this.currentEntry?.puzzle.fen ?? this.fen) : this.fen);
  }

  findBestMoveHint(): string {
    return this.translate.t(
      this.solverColor === 'b' ? 'puzzles.findBestMoveBlack' : 'puzzles.findBestMoveWhite',
    );
  }

  ngOnInit(): void {
    this.loadNext();
  }

  flipBoard(): void {
    this.orientation = this.orientation === 'white' ? 'black' : 'white';
  }

  showHint(): void {
    if (!this.puzzleId || this.isSubmitting || this.puzzleComplete) return;
    this.usedHint = true;
    this.hintLevel = this.hintLevel < 0 ? 0 : 1;
    this.refreshOverlay();
  }

  goToPrev(): void {
    this.historyIndex = Math.max(0, this.historyIndex - 1);
    this.refreshOverlay();
  }

  goToNext(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex += 1;
      this.refreshOverlay();
    } else {
      this.loadNext();
    }
  }

  skip(): void {
    if (!this.puzzleId || this.isSubmitting) return;
    this.streak = 0;
    this.loadNext();
  }

  private loadNext(): void {
    this.feedback = '';
    this.noPuzzlesDue = false;
    this.puzzleComplete = false;
    this.hintLevel = -1;
    this.usedHint = false;
    this.wrongAttempts = 0;
    this.frontierExhausted = false;
    this.puzzles.next().subscribe({
      next: (data: NextPuzzle) => {
        this.fen = data.fen;
        this.correctMoveUci = data.correctMoveUci;
        this.lastMoveUci = data.lastMoveUci;
        this.moveIndex = data.moveIndex;
        this.solverMovesTotal = data.solverMovesTotal;
        this.rating = data.rating;
        this.history = [
          ...this.history,
          {
            puzzle: data,
            solved: false,
            usedHint: false,
            finalFen: data.fen,
            finalLastMoveUci: data.lastMoveUci,
          },
        ];
        this.historyIndex = this.history.length - 1;
        this.orientation = sideToMove(data.fen) === 'b' ? 'black' : 'white';
        this.refreshOverlay();
      },
      error: (err: { status?: number }) => {
        if (err?.status === 401) {
          this.router.navigate(['/login']);
          return;
        }
        if (err?.status === 404) {
          this.lastMoveUci = '';
          this.noPuzzlesDue = true;
          this.frontierExhausted = true;
          this.feedback = this.translate.t('puzzles.noPuzzlesDue');
          this.refreshOverlay();
          return;
        }
        this.feedback = this.translate.t('puzzles.loadFailed');
      },
    });
  }

  private processMove(from: string, to: string): boolean {
    if (this.isSubmitting || !this.puzzleId || from === to) return false;
    const preFen = this.fen;
    const result = applyMove(this.fen, from, to, this.correctMoveUci);
    if (!result) {
      this.sound.play('illegal');
      return false;
    }
    this.fen = result.nextFen;
    this.sound.play(this.sound.getMoveSound(preFen, result.uci));
    this.submit(result.uci, preFen);
    return true;
  }

  private canPickUp(square: string): boolean {
    if (this.isSubmitting || !this.puzzleId) return false;
    return pieceColorAt(this.fen, square) === this.solverColor;
  }

  private submit(uci: string, preFen: string): void {
    if (!this.puzzleId || this.isSubmitting) return;
    this.isSubmitting = true;

    this.puzzles.submit(this.puzzleId, uci, this.moveIndex, this.usedHint).subscribe({
      next: (data) => {
        this.isSubmitting = false;

        if (data.correct && data.puzzleComplete) {
          this.sound.play('puzzleCorrect');
          celebratePuzzleCorrect();
          this.feedback = this.translate.t('puzzles.correct');
          this.solved += 1;
          this.streak += 1;
          this.bestStreak = Math.max(this.bestStreak, this.streak);
          this.puzzleComplete = true;
          const idx = this.history.length - 1;
          this.history = this.history.map((h, i) =>
            i === idx
              ? { ...h, solved: true, usedHint: this.usedHint }
              : h,
          );
          this.refreshOverlay();
          queueMicrotask(() => this.nextBtnRef?.nativeElement.focus());
        } else if (data.correct) {
          this.sound.play('puzzleCorrect');
          this.feedback = this.translate.t('puzzles.keepGoing');
          if (data.fenAfter) this.fen = data.fenAfter;
          if (data.opponentReplyUci) this.lastMoveUci = data.opponentReplyUci;
          if (data.nextCorrectMoveUci) this.correctMoveUci = data.nextCorrectMoveUci;
          this.hintLevel = -1;
          this.wrongAttempts = 0;
          this.moveIndex += 1;
          this.refreshOverlay();
        } else {
          this.sound.play('puzzleWrong');
          this.feedback = `❌ ${data.reason || this.translate.t('puzzles.incorrectFallback')}`;
          this.fen = preFen;
          this.streak = 0;
          this.wrongAttempts += 1;
          this.refreshOverlay();
        }
      },
      error: (err: { status?: number }) => {
        this.isSubmitting = false;
        if (err?.status === 401) this.router.navigate(['/login']);
        this.feedback = this.translate.t('puzzles.submitError');
      },
    });
  }

  private refreshOverlay(): void {
    const markers: BoardMarker[] = [];
    const lastMove = this.viewingPast ? this.currentEntry?.finalLastMoveUci : this.lastMoveUci;
    if (lastMove && lastMove.length >= 4) {
      markers.push({ square: lastMove.slice(0, 2), type: 'lastmove' });
      markers.push({ square: lastMove.slice(2, 4), type: 'lastmove' });
    }
    if (!this.viewingPast) {
      const hint = deriveHintMarkers(this.correctMoveUci, this.effectiveHintLevel, this.puzzleComplete);
      if (hint) {
        markers.push({ square: hint.from, type: 'hint' });
        if (hint.to) markers.push({ square: hint.to, type: 'hint' });
      }
    }
    this.markers = markers;

    this.arrows =
      !this.viewingPast && this.effectiveHintLevel >= 1 && !this.puzzleComplete && this.correctMoveUci
        ? [{ from: this.correctMoveUci.slice(0, 2), to: this.correctMoveUci.slice(2, 4), type: 'info' }]
        : [];
  }
}
