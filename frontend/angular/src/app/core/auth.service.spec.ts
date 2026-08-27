import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('stores tokens and user fields on successful login', () => {
    service.login('bob', 'pw').subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'bob', password: 'pw' });

    req.flush({
      id: 1,
      email: 'bob@example.com',
      username: 'bob',
      access_token: 'AT',
      refresh_token: 'RT',
    });

    expect(localStorage.getItem('token')).toBe('AT');
    expect(localStorage.getItem('refresh_token')).toBe('RT');
    expect(localStorage.getItem('username')).toBe('bob');
    expect(service.isLoggedIn).toBe(true);
  });

  it('verifies an email token', () => {
    let result: { email: string } | undefined;
    service.verifyEmail('TOK').subscribe((r) => (result = r));

    const req = httpMock.expectOne((r) => r.url === '/api/auth/verify-email');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('token')).toBe('TOK');
    req.flush({ email: 'bob@example.com' });

    expect(result).toEqual({ email: 'bob@example.com' });
  });

  it('requests a verification resend by username', () => {
    service.resendVerification('bob').subscribe();

    const req = httpMock.expectOne('/api/auth/resend-verification');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'bob' });
    req.flush(null);
  });

  it('clears all auth keys on logout', () => {
    localStorage.setItem('token', 'AT');
    localStorage.setItem('refresh_token', 'RT');
    localStorage.setItem('username', 'bob');

    service.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('username')).toBeNull();
    expect(service.isLoggedIn).toBe(false);
  });
});
