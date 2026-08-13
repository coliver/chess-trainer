import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Opening {
  eco: string;
  name: string;
  epd: string;
  pgn: string;
  uci_moves: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class OpeningsService {
  private readonly http = inject(HttpClient);

  /** GET /api/openings — public endpoint, lists openings with parsed moves. */
  getOpenings(): Observable<Opening[]> {
    return this.http.get<Opening[]>('/api/openings');
  }
}
