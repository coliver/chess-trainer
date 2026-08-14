import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { normalizeFen } from '@knight-school/chess-core';

/** Shape of `GET /api/training-sessions/:id/next` (camelCase, see backend). */
export interface NextItemResponse {
  sessionId?: number | string;
  itemId?: string | number | null;
  id?: string | number | null;
  fen?: string | null;
  fenAfter?: string | null;
  epd?: string | null;
  openingEco?: string | null;
  openingName?: string | null;
  correctMoveUci?: string;
}

/** Shape of `POST /api/training-sessions/:id/responses`. */
export interface MoveResponse {
  correct: boolean;
  reason?: string;
  fenAfter?: string | null;
  sessionCompleted?: boolean;
}

/** Normalized training item consumed by the Training page. */
export interface TrainingItem {
  fen: string;
  itemId: string | null;
  openingLabel: string;
  correctMoveUci: string;
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
  start(openingEco: string, openingName: string): Observable<{ id: string | number }> {
    return this.http.post<{ id: string | number }>('/api/training-sessions', {
      openingEco,
      openingName,
    });
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
    const rawFen = data.fenAfter ?? data.fen ?? data.epd;
    const itemIdRaw = data.itemId ?? data.id;
    return {
      fen: normalizeFen(rawFen),
      itemId: itemIdRaw == null || itemIdRaw === '' ? null : String(itemIdRaw),
      openingLabel: data.openingName
        ? `${data.openingEco ?? ''} ${data.openingName}`.trim()
        : 'Opening: (unknown)',
      correctMoveUci: data.correctMoveUci ?? '',
    };
  }
}
