import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// Shared across concurrent 401s so only one /auth/refresh request is ever in
// flight — mirrors react/src/api.ts's module-level refreshPromise. Without
// this, simultaneous requests each refresh independently and a single-use/
// rotating refresh token invalidates all but the first, wrongly logging the
// user out.
let refreshAccessToken$: Observable<string> | null = null;

function refreshAccessToken(http: HttpClient, auth: AuthService): Observable<string> {
  if (!refreshAccessToken$) {
    refreshAccessToken$ = http
      .post<{ access_token: string }>('/api/auth/refresh', {
        refresh_token: auth.refreshToken,
      })
      .pipe(
        switchMap((res) => {
          auth.setAccessToken(res.access_token);
          return [res.access_token];
        }),
        finalize(() => {
          refreshAccessToken$ = null;
        }),
        shareReplay(1),
      );
  }
  return refreshAccessToken$;
}

/**
 * Mirrors react/src/api.ts: attach the bearer token, and on a 401 try a single
 * `/auth/refresh` then replay the original request. If the refresh itself
 * fails, clear tokens and bounce to /login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const http = inject(HttpClient);
  const router = inject(Router);

  const token = auth.token;
  const authed = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      const isRefreshCall = req.url.includes('/auth/refresh');
      if (err.status !== 401 || isRefreshCall || !auth.refreshToken) {
        return throwError(() => err);
      }

      return refreshAccessToken(http, auth).pipe(
        switchMap((accessToken) => {
          const retried = req.clone({
            setHeaders: { Authorization: `Bearer ${accessToken}` },
          });
          return next(retried);
        }),
        catchError((refreshErr) => {
          auth.logout();
          router.navigate(['/login']);
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
