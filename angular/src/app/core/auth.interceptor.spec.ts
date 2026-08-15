import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('attaches the bearer token when one is present', () => {
    auth.setAccessToken('AT');

    http.get('/api/openings').subscribe();

    const req = httpMock.expectOne('/api/openings');
    expect(req.request.headers.get('Authorization')).toBe('Bearer AT');
    req.flush([]);
  });

  it('does not attach a header when there is no token', () => {
    http.get('/api/openings').subscribe();

    const req = httpMock.expectOne('/api/openings');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('refreshes the token and retries once on a 401', () => {
    auth.setAccessToken('EXPIRED');
    localStorage.setItem('refresh_token', 'RT');

    let result: unknown;
    http.get('/api/progress/summary').subscribe((r) => (result = r));

    const first = httpMock.expectOne('/api/progress/summary');
    first.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    const refresh = httpMock.expectOne('/api/auth/refresh');
    expect(refresh.request.body).toEqual({ refresh_token: 'RT' });
    refresh.flush({ access_token: 'NEW' });

    const retried = httpMock.expectOne('/api/progress/summary');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer NEW');
    retried.flush({ ok: true });

    expect(result).toEqual({ ok: true });
    expect(auth.token).toBe('NEW');
  });

  it('logs out and navigates to /login when the refresh call itself fails', () => {
    auth.setAccessToken('EXPIRED');
    localStorage.setItem('refresh_token', 'RT');
    const navigateSpy = spyOn(router, 'navigate');

    let error: unknown;
    http.get('/api/progress/summary').subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne('/api/progress/summary')
      .flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    httpMock
      .expectOne('/api/auth/refresh')
      .flush('nope', { status: 401, statusText: 'Unauthorized' });

    expect(error).toBeTruthy();
    expect(auth.token).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('does not attempt a refresh when there is no refresh token', () => {
    auth.setAccessToken('EXPIRED');

    let error: unknown;
    http.get('/api/progress/summary').subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne('/api/progress/summary')
      .flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    httpMock.expectNone('/api/auth/refresh');
    expect(error).toBeTruthy();
  });
});
