import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function normalizeFen(raw: unknown): string {
  if (raw == null) return START_FEN;
  const s = String(raw).trim();
  if (!s) return START_FEN;
  const clean = s.split('|')[0].split(';')[0].trim();
  return clean || START_FEN;
}

/**
 * Thin API layer for a training session — the Angular counterpart of the
 * request half of react's `useTrainingSession`. Session state (advance,
 * autoplay, feedback) is orchestrated by the Training page component.
 */
@Injectable({ providedIn: 'root' })
export class TrainingService {
  private readonly http = inject(HttpClient);

  next(sessionId: string): Observable<TrainingItem> {
    return new Observable<TrainingItem>((subscriber) => {
      const sub = this.http
        .get<NextItemResponse>(`/api/training-sessions/${sessionId}/next`)
        .subscribe({
          next: (data) => {
            subscriber.next(this.toItem(data));
            subscriber.complete();
          },
          error: (err) => subscriber.error(err),
        });
      return () => sub.unsubscribe();
    });
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
      itemId:
        itemIdRaw == null || itemIdRaw === '' ? null : String(itemIdRaw),
      openingLabel: data.openingName
        ? `${data.openingEco ?? ''} ${data.openingName}`.trim()
        : 'Opening: (unknown)',
      correctMoveUci: data.correctMoveUci ?? '',
    };
  }

  static readonly START_FEN = START_FEN;
  static normalizeFen = normalizeFen;
}
