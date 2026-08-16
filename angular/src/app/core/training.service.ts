import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  NextItemResponse,
  TrainingItem,
  deriveNextItem,
} from '@knight-school/chess-core';

// Re-export for use in components
export type { TrainingItem };

/** Shape of `POST /api/training-sessions/:id/responses`. */
export interface MoveResponse {
  correct: boolean;
  reason?: string;
  fenAfter?: string | null;
  sessionCompleted?: boolean;
}

/**
 * Thin API layer for a training session — the Angular counterpart of the
 * request half of react's `useTrainingSession`. Session state (advance,
 * autoplay, feedback) is orchestrated by the Training page component. FEN
 * helpers come from the shared @knight-school/chess-core package.
 */
@Injectable({ providedIn: 'root' })
export class TrainingService {
  private readonly http = inject(HttpClient);

  /** POST /api/training-sessions — starts a session for the given opening. */
  start(
    openingEco: string,
    openingName: string,
    playerColor: 'w' | 'b' = 'w',
  ): Observable<{ id: string | number }> {
    return this.http.post<{ id: string | number }>('/api/training-sessions', {
      openingEco,
      openingName,
      playerColor,
    });
  }

  /** POST /api/training-sessions/from-due — starts a review session from due positions. */
  startFromDue(): Observable<{ id: string | number }> {
    return this.http.post<{ id: string | number }>('/api/training-sessions/from-due', {});
  }

  next(sessionId: string): Observable<TrainingItem> {
    return this.http
      .get<NextItemResponse>(`/api/training-sessions/${sessionId}/next`)
      .pipe(map((data) => this.toItem(data)));
  }

  submit(
    sessionId: string,
    itemId: string,
    moveUci: string,
  ): Observable<MoveResponse> {
    return this.http.post<MoveResponse>(
      `/api/training-sessions/${sessionId}/responses`,
      { itemId, moveUci },
    );
  }

  private toItem(data: NextItemResponse): TrainingItem {
    return deriveNextItem(data);
  }
}
