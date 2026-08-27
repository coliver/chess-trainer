import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Shape of `GET`/`PATCH /api/users/me/preferences` — mirrors backend/app/routers/users.py. */
export interface Preferences {
  language: string;
  theme: 'light' | 'dark' | 'system';
  board_theme: string;
  piece_set: string;
  show_coordinates: boolean;
  board_animations: boolean;
  board_orientation_mode: 'auto' | 'white' | 'black';
  sound: boolean;
}

/**
 * Thin API layer for the signed-in user's preferences — the Angular
 * counterpart of react/src/context/PreferencesContext.tsx's server sync
 * (`api.get`/`api.patch("/users/me/preferences")`). Local persistence and
 * defaults live with the Settings page that consumes this, not here.
 */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/users/me/preferences';

  get(): Observable<Preferences> {
    return this.http.get<Preferences>(this.base);
  }

  update(partial: Partial<Preferences>): Observable<Preferences> {
    return this.http.patch<Preferences>(this.base, partial);
  }
}
