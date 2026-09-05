import { Component, ChangeDetectionStrategy, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  applyMove,
  applyUci,
  legalMoves,
  normalizeFen,
  pieceColorAt,
  sideToMove,
  START_FEN,
  Timeline,
  createTimeline,
  appendTimelineFen as coreAppendTimelineFen,
  jumpToIndex as coreJumpToIndex,
  isAtLatest,
  deriveStatus,
  splitOpeningLabel,
  deriveHintMarkers,
} from '@knight-school/chess-core';
import { BoardComponent, BoardArrow, BoardMarker } from './board.component';
import { TrainingItem, TrainingService } from '../../core/training.service';
import { FlipBoardButtonComponent } from '../../shared/flip-board-button.component';
import { SoundService } from '../../core/sound.service';
import { celebrateWin } from '../../lib/win-celebration';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

const BLINK_CYCLE_MS = 420; // fadeIn(120) + hold(120) + fadeOut(180), matches react's useBlinkGreen

/**
 * Angular training page — mirror of react/src/pages/Training.tsx: a
 * board + right-rail layout with a move timeline (prev/next through the
 * plies actually played), a two-level hint, a status banner, and a brief
 * green blink on the just-played correct move.
 */
@Component({
  selector: 'app-training',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, BoardComponent, FlipBoardButtonComponent, TranslatePipe],
  template: `
    <main class="page">
      <div class="card">
        <div class="train">
          <div class="train-board-col">
            <div class="training-board-wrap">
              <app-board
                [position]="fen"
                [orientation]="orientation"
                [interactive]="true"
                [moveColor]="playerColor === 'b' ? 'black' : 'white'"
                [markers]="markers"
                [arrows]="arrows"
                [getLegalMoves]="getLegalMoves"
                [onMoveStart]="onMoveStart"
                [onMove]="onMove"
              ></app-board>
            </div>
            <div class="board-under">
              <span class="turn" [class.black]="!isWhiteToMove">
                <span class="turn-dot" aria-hidden="true"></span>
                {{ (isWhiteToMove ? 'training.whiteToMove' : 'training.blackToMove') | translate }}
              </span>
              <app-flip-board-button (flip)="flipBoard()" />
            </div>
          </div>

          <aside class="train-rail">
            <div class="rail-head">
              <div class="rail-eyebrow">{{ 'training.eyebrow' | translate }}</div>
              <div class="rail-title">
                <h1>{{ openingName }}</h1>
                @if (eco) {
                  <span class="eco-chip">{{ eco }}</span>
                }
              </div>
            </div>

            <div class="train-status {{ statusKind }}" role="status">
              <span class="train-status-ic" aria-hidden="true">{{ statusIcon }}</span>
              <div>
                <div class="train-status-msg">{{ statusMsg }}</div>
                @if (statusSub) {
                  <div class="train-status-sub">{{ statusSub }}</div>
                }
              </div>
            </div>

            <div class="train-controls">
              <div class="train-stepper">
                <button
                  class="btn"
                  type="button"
                  (click)="jumpToIndex(timeline.index - 1)"
                  [disabled]="busy || timeline.index <= 0"
                >
                  {{ 'training.prev' | translate }}
                </button>
                <button
                  class="btn"
                  type="button"
                  (click)="jumpToIndex(timeline.index + 1)"
                  [disabled]="busy || timeline.index >= timeline.fens.length - 1"
                >
                  {{ 'training.next' | translate }}
                </button>
              </div>

              <button
                class="btn hint"
                type="button"
                (click)="hint()"
                [disabled]="busy || !itemId"
                [attr.aria-label]="'training.showHint' | translate"
                [title]="'training.showHint' | translate"
              >
                💡
              </button>

              <form class="train-type-move" (ngSubmit)="onTextSubmit()">
                <input
                  class="text-input"
                  name="moveInput"
                  [(ngModel)]="moveInput"
                  [placeholder]="'training.movePlaceholder' | translate"
                  [disabled]="isSubmitting"
                />
                <button
                  class="btn primary"
                  type="submit"
                  [disabled]="busy || !moveInput.trim() || !atLatest"
                  [title]="!atLatest ? ('training.jumpToLatest' | translate) : undefined"
                >
                  {{ 'training.play' | translate }}
                </button>
              </form>
            </div>

            <button class="train-exit" type="button" (click)="exit()">
              {{ 'training.backToOpenings' | translate }}
            </button>
          </aside>
        </div>
      </div>
    </main>
  `,
})
export class TrainingComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly training = inject(TrainingService);
  private readonly sound = inject(SoundService);

  sessionId = '';
  fen = START_FEN;
  itemId: string | null = null;
  correctMoveUci = '';
  playerColor: 'w' | 'b' = 'w';
  openingLabel = '';
  feedback = '';
  moveInput = '';
  isSubmitting = false;
  isAdvancing = false;
  isSessionCompleted = false;
  hintLevel = -1;
  wrongAttempts = 0;
  markers: BoardMarker[] = [];
  arrows: BoardArrow[] = [];
  orientation: 'white' | 'black' = 'white';

  timeline: Timeline = createTimeline(START_FEN);

  private blinkSquare: string | null = null;
  private blinkTimer: ReturnType<typeof setTimeout> | null = null;
  private autoplayedItemId: string | null = null;
  private advanceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly onMove = (from: string, to: string): boolean => this.processMove(from, to);
  readonly onMoveStart = (square: string): boolean => this.canPickUp(square);
  readonly getLegalMoves = (square: string) => legalMoves(this.fen, square);

  get isWhiteToMove(): boolean {
    return sideToMove(this.fen) === 'w';
  }

  get isPlayerToMove(): boolean {
    return sideToMove(this.fen) === this.playerColor;
  }

  get atLatest(): boolean {
    return isAtLatest(this.timeline);
  }

  get busy(): boolean {
    return this.isSubmitting || this.isAdvancing;
  }

  // After 2 misses on this move, reveal the source-square hint; after 2 more
  // (4 total), reveal the target square too and draw an arrow to it. Derived
  // (not stored) so it only ever raises whatever the manual hint button set.
  private get effectiveHintLevel(): number {
    return Math.max(
      this.hintLevel,
      this.wrongAttempts >= 4 ? 1 : this.wrongAttempts >= 2 ? 0 : -1,
    );
  }

  private get openingParts() {
    return splitOpeningLabel(this.openingLabel);
  }

  get eco(): string {
    return this.openingParts.eco;
  }

  get openingName(): string {
    return this.openingParts.openingName;
  }

  private get status() {
    return deriveStatus({
      isSessionCompleted: this.isSessionCompleted,
      feedback: this.feedback,
      hintLevel: this.effectiveHintLevel,
      isPlayerToMove: this.isPlayerToMove,
      playerColor: this.playerColor,
    });
  }

  get statusKind(): string {
    return this.status.kind;
  }

  get statusIcon(): string {
    return this.status.icon;
  }

  get statusMsg(): string {
    return this.status.message;
  }

  get statusSub(): string {
    return this.status.sub;
  }

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.sessionId) this.loadNext();
  }

  ngOnDestroy(): void {
    if (this.advanceTimer) clearTimeout(this.advanceTimer);
    if (this.blinkTimer) clearTimeout(this.blinkTimer);
  }

  private loadNext(): void {
    this.training.next(this.sessionId).subscribe({
      next: (item) => {
        this.applyItem(item);
        this.feedback = '';
        this.isSessionCompleted = false;
        this.resetTimeline(item.fen);
        this.maybeAutoplay();
        this.sound.play('gameStart');
      },
      error: () => {
        this.feedback = 'No more moves in this session or session expired.';
      },
    });
  }

  private applyItem(item: TrainingItem): void {
    this.itemId = item.itemId;
    this.fen = item.fen;
    this.openingLabel = item.openingLabel;
    this.correctMoveUci = item.correctMoveUci;
    this.playerColor = item.playerColor;
    this.orientation = item.playerColor === 'b' ? 'black' : 'white';
    this.hintLevel = -1;
    this.wrongAttempts = 0;
    this.updateMarkers();
  }

  private resetTimeline(fen: string): void {
    this.timeline = createTimeline(fen);
  }

  private appendTimelineFen(nextFen: string): void {
    this.timeline = coreAppendTimelineFen(this.timeline, nextFen);
  }

  jumpToIndex(nextIndex: number): void {
    const next = coreJumpToIndex(this.timeline, nextIndex);
    if (next === this.timeline) return;
    this.timeline = next;
    this.fen = this.timeline.fens[this.timeline.index] ?? this.timeline.fens[0];
    this.feedback = '';
    this.moveInput = '';
    this.hintLevel = -1;
    this.updateMarkers();
  }

  private maybeAutoplay(): void {
    if (!this.itemId || this.isSubmitting || this.isAdvancing) return;
    if (!this.correctMoveUci) return;
    if (this.autoplayedItemId === this.itemId) return;
    if (sideToMove(this.fen) === this.playerColor) return;

    this.autoplayedItemId = this.itemId;
    const uci = this.correctMoveUci;
    const preFen = this.fen;
    const applied = applyUci(this.fen, uci);
    if (applied) {
      this.fen = applied.nextFen;
      this.appendTimelineFen(applied.nextFen);
      this.sound.play('moveOpponent');
    }
    // Opponent's reply, not the player's turn — don't show the "Correct!" banner for it.
    this.submitMove(uci, preFen, { silent: true });
  }

  processMove(from: string, to: string): boolean {
    if (this.isSubmitting || this.isAdvancing || !this.itemId) return false;
    if (!from || !to || from === to) return false;

    const preFen = this.fen;
    const result = applyMove(this.fen, from, to, this.correctMoveUci);
    if (!result) {
      this.sound.play('illegal');
      this.feedback = '❌ Illegal move';
      return false;
    }

    this.fen = result.nextFen;
    this.appendTimelineFen(result.nextFen);
    this.feedback = '';
    this.moveInput = result.uci;
    this.submitMove(result.uci, preFen);
    this.sound.play(this.sound.getMoveSound(preFen, result.uci));
    return true;
  }

  private canPickUp(square: string): boolean {
    if (!this.atLatest) return false;
    if (this.isSubmitting || this.isAdvancing || !this.itemId) return false;
    if (!this.isPlayerToMove) return false;
    return pieceColorAt(this.fen, square) === this.playerColor;
  }

  private submitMove(uci: string, preFen: string, options: { silent?: boolean } = {}): void {
    if (!this.itemId) return;
    const silent = options.silent ?? false;
    const prevItemId = this.itemId;
    this.isSubmitting = true;

    this.training.submit(this.sessionId, this.itemId, uci).subscribe({
      next: (data) => {
        this.isSubmitting = false;

        if (data.correct) {
          if (!silent) {
            this.sound.play('correct');
            this.feedback = '✅ Correct!';
          }
          this.hintLevel = -1;
          this.wrongAttempts = 0;
          this.blinkGreen(uci, 2);

          if (data.fenAfter) {
            this.fen = normalizeFen(data.fenAfter);
          }

          if (data.sessionCompleted) {
            if (this.advanceTimer) {
              clearTimeout(this.advanceTimer);
              this.advanceTimer = null;
            }
            this.sound.play('achievement');
            celebrateWin();
            this.feedback = '✅ Session completed.';
            this.isSessionCompleted = true;
            this.isAdvancing = false;
            return;
          }

          this.isAdvancing = true;
          if (this.advanceTimer) clearTimeout(this.advanceTimer);
          this.advanceTimer = setTimeout(() => {
            this.training.next(this.sessionId).subscribe({
              next: (next) => {
                if (next.itemId === prevItemId) {
                  this.feedback = '✅ Opening complete.';
                  this.fen = next.fen;
                  this.openingLabel = next.openingLabel;
                  this.correctMoveUci = next.correctMoveUci;
                  this.playerColor = next.playerColor;
                  this.orientation = next.playerColor === 'b' ? 'black' : 'white';
                } else {
                  this.applyItem(next);
                  this.feedback = '';
                  this.isSessionCompleted = false;
                  this.resetTimeline(next.fen);
                  this.maybeAutoplay();
                }
                this.isAdvancing = false;
              },
              error: (err: { status?: number }) => {
                if (err?.status === 401) this.router.navigate(['/login']);
                this.feedback = 'No more moves in this session or session expired.';
                this.isAdvancing = false;
              },
            });
          }, 500);
          return;
        }

        // Incorrect: revert to the position that was actually submitted from.
        this.sound.play('incorrect');
        this.fen = preFen;
        this.resetTimeline(preFen);
        this.feedback = `❌ ${data.reason ?? 'Incorrect move'}`;
        if (!silent) {
          this.wrongAttempts += 1;
          this.updateMarkers();
        }
      },
      error: (err: { status?: number }) => {
        this.isSubmitting = false;
        if (err?.status === 401) this.router.navigate(['/login']);
        this.feedback = err?.status === 404 ? 'Session completed.' : 'Error submitting move';
      },
    });
  }

  onTextSubmit(): void {
    const uci = this.moveInput.trim();
    if (!uci || !this.atLatest) return;
    this.feedback = '';
    this.submitMove(uci, this.fen);
    this.moveInput = '';
  }

  hint(): void {
    if (this.isSubmitting || this.isAdvancing || !this.itemId) return;
    this.hintLevel = this.hintLevel < 0 ? 0 : 1;
    this.updateMarkers();
  }

  exit(): void {
    this.router.navigate(['/dashboard']);
  }

  flipBoard(): void {
    this.orientation = this.orientation === 'white' ? 'black' : 'white';
  }

  private blinkGreen(uci: string, times: number): void {
    const toSquare = uci.slice(2, 4);
    if (!toSquare) return;

    if (this.blinkTimer) clearTimeout(this.blinkTimer);
    this.blinkSquare = toSquare;
    this.updateMarkers();

    this.blinkTimer = setTimeout(() => {
      this.blinkSquare = null;
      this.updateMarkers();
    }, times * BLINK_CYCLE_MS + 50);
  }

  private updateMarkers(): void {
    const effectiveHintLevel = this.effectiveHintLevel;
    const arr: BoardMarker[] = [];
    const hint = deriveHintMarkers(this.correctMoveUci, effectiveHintLevel, this.isSessionCompleted);
    if (hint) {
      arr.push({ square: hint.from, type: 'hint' });
      if (hint.to) arr.push({ square: hint.to, type: 'hint' });
    }
    if (this.blinkSquare) arr.push({ square: this.blinkSquare, type: 'blink' });
    this.markers = arr;

    // Arrow to the correct square once the deep hint (level 1) kicks in.
    this.arrows =
      effectiveHintLevel >= 1 && !this.isSessionCompleted && this.correctMoveUci
        ? [{ from: this.correctMoveUci.slice(0, 2), to: this.correctMoveUci.slice(2, 4), type: 'info' }]
        : [];
  }
}
