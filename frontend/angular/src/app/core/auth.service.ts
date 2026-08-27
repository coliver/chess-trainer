import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface LoginResponse {
  id: number | string;
  email: string;
  username: string;
  access_token: string;
  refresh_token: string;
}

/**
 * Auth against the same-origin backend. nginx proxies `/api` to FastAPI, so
 * there is no CORS and the tokens stored here live in the same localStorage as
 * the React frontend — logging in on one frontend carries over to the other.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  // localStorage keys are kept identical to the React app (react/src/auth.ts).
  private readonly keys = ['token', 'refresh_token', 'user_id', 'username', 'email'];

  // Reactive counterpart of `isLoggedIn` for services (e.g. PreferencesStoreService)
  // that need to react to login/logout rather than re-check localStorage each cycle.
  readonly loggedIn = signal(!!localStorage.getItem('token'));

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.base}/auth/login`, { username, password })
      .pipe(tap((data) => this.store(data)));
  }

  register(email: string, username: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/register`, { email, username, password });
  }

  me(): Observable<{ id: number | string; username: string }> {
    return this.http.get<{ id: number | string; username: string }>(`${this.base}/auth/me`);
  }

  verifyEmail(token: string): Observable<{ email: string }> {
    return this.http.get<{ email: string }>(`${this.base}/auth/verify-email`, {
      params: { token },
    });
  }

  resendVerification(username: string): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/resend-verification`, { username });
  }

  get token(): string | null {
    return localStorage.getItem('token');
  }

  get refreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  get username(): string | null {
    return localStorage.getItem('username');
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  setAccessToken(token: string): void {
    localStorage.setItem('token', token);
  }

  logout(): void {
    this.keys.forEach((k) => localStorage.removeItem(k));
    this.loggedIn.set(false);
  }

  private store(d: LoginResponse): void {
    localStorage.setItem('token', d.access_token);
    localStorage.setItem('refresh_token', d.refresh_token);
    localStorage.setItem('user_id', String(d.id));
    localStorage.setItem('username', d.username);
    localStorage.setItem('email', d.email);
    this.loggedIn.set(true);
  }
}
