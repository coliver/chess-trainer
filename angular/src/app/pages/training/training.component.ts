import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  START_FEN,
  normalizeFen,
  applyMove,
  applyUci,
  legalMoves,
  pieceColorAt,
  sideToMove,
} from '@knight-school/chess-core';
import { BoardComponent, BoardMarker } from './board.component';
import { TrainingItem, TrainingService } from '../../core/training.service';

/**
 * Angular training page — mirror of react's Training page. The chess logic
 * comes from the shared @knight-school/chess-core package; cm-chessboard is
 * wrapped by BoardComponent. Session state (submit / advance / autoplay) is
 * orchestrated here.
 */
@Component({
  selector: 'app-training',
  standalone: true,
  imports: [FormsModule, BoardComponent],
  template: `
    <main class="page">
      <div class="card">
        <div class="head">
          <div class="title">Training</div>
          <div class="subtitle">{{ openingLabel }}</div>
        </div>

        <div class="board-wrap">
          <app-board
            [position]="fen"
            [interactive]="true"
            moveColor="white"
            [markers]="markers"
            [getLegalMoves]="getLegalMoves"
            [onMoveStart]="onMoveStart"
            [onMove]="onMove"
          ></app-board>
        </div>

        <form class="form" (ngSubmit)="onTextSubmit()">
          <input
            class="text-input"
            name="moveInput"
            [(ngModel)]="moveInput"
            placeholder="e.g. e2e4"
            [disabled]="isSubmitting"
          />

          <div class="actions">
            <button
              class="btn"
              type="submit"
              [disabled]="isSubmitting || isAdvancing || !moveInput.trim()"
            >
              Submit
            </button>
            <button
              class="btn secondary"
              type="button"
              (click)="hint()"
              [disabled]="isSubmitting || isAdvancing || !itemId"
            >
              Hint
            </button>
          </div>

          <div class="turn">{{ isWhiteToMove ? 'White' : 'Black' }} to move.</div>
        </form>

        <p class="feedback">{{ feedback }}</p>
      </div>
    </main>
  `,
  styles: [
    `
      .page {
        display: flex;
        justify-content: center;
        padding: 2rem 1rem;
      }
      .card {
        width: 100%;
        max-width: 520px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 1.5rem;
        text-align: center;
      }
      .title {
        font-weight: 700;
        font-size: 1.25rem;
      }
      .subtitle {
        color: var(--muted);
        margin: 0.25rem 0 1rem;
      }
      .board-wrap {
        width: 100%;
        margin: 0 auto 1rem;
      }
      .form {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
      }
      .text-input {
        width: 100%;
        max-width: 220px;
        padding: 0.55rem 0.7rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--bg);
        color: inherit;
        font: inherit;
      }
      .actions {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
        justify-content: center;
      }
      .btn {
        border: 1px solid var(--accent);
        background: var(--accent);
        color: #fff;
        border-radius: 10px;
        padding: 0.5rem 0.9rem;
        font-weight: 600;
        cursor: pointer;
      }
      .btn.secondary {
        background: transparent;
        color: var(--text, inherit);
      }
      .btn:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .turn {
        color: var(--muted);
        font-size: 0.85rem;
      }
      .feedback {
        min-height: 1.5rem;
        margin-top: 0.75rem;
      }
    `,
  ],
})
export class TrainingComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly training = inject(TrainingService);

  sessionId = '';
  fen = START_FEN;
  itemId: string | null = null;
  correctMoveUci = '';
  openingLabel = '';
  feedback = '';
  moveInput = '';
  isSubmitting = false;
  isAdvancing = false;
  hintLevel = -1;
  markers: BoardMarker[] = [];

  private autoplayedItemId: string | null = null;
  private advanceTimer: ReturnType<typeof setTimeout> | null = null;

  // Stable references passed to <app-board> (arrow fns keep `this`).
  readonly onMove = (from: string, to: string): boolean =>
    this.processMove(from, to);
  readonly onMoveStart = (square: string): boolean => this.canPickUp(square);
  readonly getLegalMoves = (square: string) => legalMoves(this.fen, square);

  get isWhiteToMove(): boolean {
    return sideToMove(this.fen) === 'w';
  }

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.sessionId) this.loadNext();
  }

  ngOnDestroy(): void {
    if (this.advanceTimer) clearTimeout(this.advanceTimer);
  }

  private loadNext(): void {
    this.training.next(this.sessionId).subscribe({
      next: (item) => {
        this.applyItem(item);
        this.feedback = '';
        this.maybeAutoplay();
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
    this.hintLevel = -1;
    this.updateMarkers();
  }

  private maybeAutoplay(): void {
    if (!this.itemId || this.isSubmitting || this.isAdvancing) return;
    if (!this.correctMoveUci) return;
    if (this.autoplayedItemId === this.itemId) return;
    if (sideToMove(this.fen) !== 'b') return;

    this.autoplayedItemId = this.itemId;
    const uci = this.correctMoveUci;
    const preFen = this.fen;
    const applied = applyUci(this.fen, uci);
    if (applied) this.fen = applied.nextFen;
    this.submitMove(uci, preFen);
  }

  processMove(from: string, to: string): boolean {
    if (this.isSubmitting || this.isAdvancing || !this.itemId) return false;
    if (!from || !to || from === to) return false;

    const preFen = this.fen;
    const result = applyMove(this.fen, from, to, this.correctMoveUci);
    if (!result) {
      this.feedback = '❌ Illegal move';
      return false;
    }

    this.fen = result.nextFen;
    this.feedback = '';
    this.moveInput = result.uci;
    this.submitMove(result.uci, preFen);
    return true;
  }

  private canPickUp(square: string): boolean {
    if (this.isSubmitting || this.isAdvancing || !this.itemId) return false;
    if (!this.isWhiteToMove) return false;
    return pieceColorAt(this.fen, square) === 'w';
  }

  private submitMove(uci: string, preFen: string): void {
    if (!this.itemId) return;
    this.isSubmitting = true;

    this.training.submit(this.sessionId, this.itemId, uci).subscribe({
      next: (data) => {
        this.isSubmitting = false;
        if (data.correct) {
          this.feedback = '✅ Correct!';
          if (data.fenAfter) {
            this.fen = normalizeFen(data.fenAfter);
          }
          if (data.sessionCompleted) {
            this.feedback = '✅ Session completed.';
            return;
          }
          this.isAdvancing = true;
          this.advanceTimer = setTimeout(() => {
            this.isAdvancing = false;
            this.loadNext();
          }, 500);
        } else {
          this.fen = preFen;
          this.feedback = `❌ ${data.reason ?? 'Incorrect move'}`;
        }
      },
      error: (err: { status?: number }) => {
        this.isSubmitting = false;
        this.feedback =
          err?.status === 404 ? 'Session completed.' : 'Error submitting move';
      },
    });
  }

  onTextSubmit(): void {
    const uci = this.moveInput.trim();
    if (!uci) return;
    this.feedback = '';
    this.submitMove(uci, this.fen);
    this.moveInput = '';
  }

  hint(): void {
    if (this.isSubmitting || this.isAdvancing || !this.itemId) return;
    this.hintLevel = this.hintLevel < 0 ? 0 : 1;
    this.updateMarkers();
  }

  private updateMarkers(): void {
    const arr: BoardMarker[] = [];
    if (this.correctMoveUci && this.hintLevel >= 0) {
      arr.push({ square: this.correctMoveUci.substring(0, 2), type: 'hint' });
      if (this.hintLevel === 1) {
        arr.push({ square: this.correctMoveUci.substring(2, 4), type: 'hint' });
      }
    }
    this.markers = arr;
  }
}
