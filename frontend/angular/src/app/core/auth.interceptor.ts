import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

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

      return http
        .post<{ access_token: string }>('/api/auth/refresh', {
          refresh_token: auth.refreshToken,
        })
        .pipe(
          switchMap((res) => {
            auth.setAccessToken(res.access_token);
            const retried = req.clone({
              setHeaders: { Authorization: `Bearer ${res.access_token}` },
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
