import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProgressSummary {
  positionsSeen: number;
  overallAccuracy: number;
  mastered: number;
  currentStreak: number;
  longestStreak: number;
}

export interface DuePosition {
  fen: string;
  correctMoveUci: string;
  openingEco?: string | null;
  openingName?: string | null;
  dueAt?: string | null;
}

export interface WeakSpot {
  fen?: string | null;
  correctMoveUci?: string | null;
  openingEco?: string | null;
  openingName?: string | null;
  attempts: number;
  correctCount: number;
  incorrectCount: number;
}

export interface CommonWrongMove {
  moveUci: string;
  count: number;
}

export interface StepAccuracy {
  openingEco?: string | null;
  openingName?: string | null;
  orderIndex: number;
  correctMoveUci: string;
  attempts: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  commonWrongMoves: CommonWrongMove[];
}

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly http = inject(HttpClient);

  getSummary(): Observable<ProgressSummary> {
    return this.http.get<ProgressSummary>('/api/progress/summary');
  }

  getDue(): Observable<DuePosition[]> {
    return this.http.get<DuePosition[]>('/api/progress/due');
  }

  getWeakSpots(): Observable<WeakSpot[]> {
    return this.http.get<WeakSpot[]>('/api/progress/weak-spots');
  }

  getStepAccuracy(): Observable<StepAccuracy[]> {
    return this.http.get<StepAccuracy[]>('/api/progress/step-accuracy');
  }
}
