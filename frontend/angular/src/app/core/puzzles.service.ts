import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Shape of `GET /api/puzzles/next`. */
export interface NextPuzzle {
  puzzleId: string;
  fen: string;
  rating: number;
  themes?: string | null;
  correctMoveUci: string;
  lastMoveUci: string;
  moveIndex: number;
  solverMovesTotal: number;
}

/** Shape of `POST /api/puzzles/:id/attempts`. */
export interface PuzzleAttemptResult {
  correct: boolean;
  reason: string;
  fenAfter?: string | null;
  puzzleComplete?: boolean | null;
  opponentReplyUci?: string | null;
  nextCorrectMoveUci?: string | null;
}

/** Shape of `GET /api/puzzles/summary`. */
export interface PuzzleSummary {
  puzzlesSeen: number;
  overallAccuracy: number;
  mastered: number;
}

/** Shape of one entry in `GET /api/puzzles/themes`. */
export interface ThemeCount {
  theme: string;
  count: number;
}

/**
 * Thin API layer for puzzles — the Angular counterpart of the request half
 * of react's Puzzles.tsx (`api.get('/puzzles/next')` /
 * `api.post('/puzzles/:id/attempts')`).
 */
@Injectable({ providedIn: 'root' })
export class PuzzlesService {
  private readonly http = inject(HttpClient);

  next(): Observable<NextPuzzle> {
    return this.http.get<NextPuzzle>('/api/puzzles/next');
  }

  submit(
    puzzleId: string,
    moveUci: string,
    moveIndex: number,
    usedHint = false,
  ): Observable<PuzzleAttemptResult> {
    return this.http.post<PuzzleAttemptResult>(`/api/puzzles/${puzzleId}/attempts`, {
      moveUci,
      moveIndex,
      usedHint,
    });
  }

  getSummary(): Observable<PuzzleSummary> {
    return this.http.get<PuzzleSummary>('/api/puzzles/summary');
  }

  themes(): Observable<ThemeCount[]> {
    return this.http.get<ThemeCount[]>('/api/puzzles/themes');
  }
}
