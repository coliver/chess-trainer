import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  START_FEN,
  applyMove,
  legalMoves,
  pieceColorAt,
  sideToMove,
} from '@knight-school/chess-core';
import { BoardComponent, BoardMarker } from '../training/board.component';
import { FlipBoardButtonComponent } from '../../shared/flip-board-button.component';
import { NextPuzzle, PuzzlesService } from '../../core/puzzles.service';

/**
 * Angular puzzles page — mirror of react/src/pages/Puzzles.tsx: loads the
 * next due puzzle, lets the user drag a move on the board (or it snaps back
 * on a wrong answer), and tracks a solved count plus a current/best streak
 * with a Skip control so a stuck user isn't stranded.
 */
@Component({
  selector: 'app-puzzles',
  standalone: true,
  imports: [BoardComponent, FlipBoardButtonComponent],
  template: `
    <main class="page">
      <div class="card puzzles-card">
        <header class="puzzles-header">
          <h1>Puzzles</h1>
          <div class="puzzles-meta">
            @if (rating !== null) {
              <span>Rating ~{{ rating }}</span>
            }
            <span>Solved: {{ solved }}</span>
            <span class="puzzles-streak" [class.is-active]="streak > 0">
              Streak: {{ streak }}{{ streak > 0 ? ' 🔥' : '' }}{{
                bestStreak > 0 ? ' · best ' + bestStreak : ''
              }}
            </span>
          </div>
        </header>

        <div class="puzzles-board-wrap">
          <app-board
            [position]="fen"
            [orientation]="orientation"
            [interactive]="!!puzzleId && !isSubmitting"
            [moveColor]="solverColor === 'b' ? 'black' : 'white'"
            [markers]="markers"
            [getLegalMoves]="getLegalMoves"
            [onMoveStart]="onMoveStart"
            [onMove]="onMove"
          ></app-board>
        </div>
        <div class="board-under">
          <span class="turn" [class.black]="solverColor === 'b'">
            <span class="turn-dot" aria-hidden="true"></span>
            {{ solverColor === 'b' ? 'Black to move' : 'White to move' }}
          </span>
          <app-flip-board-button (flip)="flipBoard()" />
        </div>

        <p class="puzzles-feedback" role="status">
          {{ feedback || (puzzleId ? 'Find the best move.' : '') }}
        </p>

        @if (puzzleId) {
          <button
            type="button"
            class="puzzles-skip"
            (click)="skip()"
            [disabled]="isSubmitting"
          >
            Skip puzzle ›
          </button>
        }
      </div>
    </main>
  `,
})
export class PuzzlesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly puzzles = inject(PuzzlesService);

  puzzleId: string | null = null;
  fen = START_FEN;
  correctMoveUci = '';
  rating: number | null = null;
  feedback = '';
  isSubmitting = false;
  solved = 0;
  streak = 0;
  bestStreak = 0;
  orientation: 'white' | 'black' = 'white';
  markers: BoardMarker[] = [];

  readonly onMove = (from: string, to: string): boolean => this.processMove(from, to);
  readonly onMoveStart = (square: string): boolean => this.canPickUp(square);
  readonly getLegalMoves = (square: string) => legalMoves(this.fen, square);

  get solverColor(): string {
    return sideToMove(this.fen);
  }

  ngOnInit(): void {
    this.loadNext();
  }

  flipBoard(): void {
    this.orientation = this.orientation === 'white' ? 'black' : 'white';
  }

  private loadNext(): void {
    this.feedback = '';
    this.puzzles.next().subscribe({
      next: (data: NextPuzzle) => {
        this.puzzleId = data.puzzleId;
        this.fen = data.fen;
        this.correctMoveUci = data.correctMoveUci;
        this.rating = data.rating;
      },
      error: (err: { status?: number }) => {
        if (err?.status === 401) {
          this.router.navigate(['/login']);
          return;
        }
        if (err?.status === 404) {
          this.puzzleId = null;
          this.feedback = 'No puzzles due right now — check back later.';
          return;
        }
        this.feedback = 'Failed to load a puzzle. Check your connection.';
      },
    });
  }

  private processMove(from: string, to: string): boolean {
    if (this.isSubmitting || !this.puzzleId || from === to) return false;
    const preFen = this.fen;
    const result = applyMove(this.fen, from, to, this.correctMoveUci);
    if (!result) return false;
    this.fen = result.nextFen;
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

    this.puzzles.submit(this.puzzleId, uci).subscribe({
      next: (data) => {
        this.isSubmitting = false;

        if (data.correct) {
          this.feedback = '✅ Correct!';
          this.solved += 1;
          this.streak += 1;
          this.bestStreak = Math.max(this.bestStreak, this.streak);
          setTimeout(() => this.loadNext(), 600);
        } else {
          this.feedback = `❌ ${data.reason || 'Not quite — try again.'}`;
          this.fen = preFen;
          this.streak = 0;
        }
      },
      error: (err: { status?: number }) => {
        this.isSubmitting = false;
        if (err?.status === 401) this.router.navigate(['/login']);
        this.feedback = 'Error submitting move.';
      },
    });
  }

  skip(): void {
    if (!this.puzzleId || this.isSubmitting) return;
    this.streak = 0;
    this.loadNext();
  }
}
