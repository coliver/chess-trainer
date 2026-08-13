import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Route guard equivalent to react/src/RequireAuth.tsx: it does not trust a
 * token's mere presence — it calls GET /auth/me and only allows the route when
 * the backend confirms a valid user, redirecting to /login otherwise.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.me().pipe(
    map((user) =>
      user && typeof user.username === 'string' ? true : router.createUrlTree(['/login']),
    ),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
