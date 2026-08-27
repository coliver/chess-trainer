import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Observable } from 'rxjs';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), Router],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function runGuard(): Observable<boolean | UrlTree> {
    return TestBed.runInInjectionContext(
      () => authGuard({} as never, {} as never) as Observable<boolean | UrlTree>,
    );
  }

  it('allows the route when /auth/me confirms a user', (done) => {
    runGuard().subscribe((value) => {
      expect(value).toBe(true);
      done();
    });

    httpMock.expectOne('/api/auth/me').flush({ id: 1, username: 'bob' });
  });

  it('redirects to /login when the user shape is invalid', (done) => {
    runGuard().subscribe((value) => {
      expect(value instanceof UrlTree).toBe(true);
      expect((value as UrlTree).toString()).toBe('/login');
      done();
    });

    httpMock.expectOne('/api/auth/me').flush({});
  });

  it('redirects to /login when /auth/me errors', (done) => {
    runGuard().subscribe((value) => {
      expect(value instanceof UrlTree).toBe(true);
      expect((value as UrlTree).toString()).toBe('/login');
      done();
    });

    httpMock.expectOne('/api/auth/me').flush('nope', { status: 401, statusText: 'Unauthorized' });
  });
});
