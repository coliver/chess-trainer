import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  it('marks success and navigates to /login on a successful registration', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    const navigateSpy = spyOn(router, 'navigate');
    const cmp = fixture.componentInstance;
    cmp.email = 'bob@example.com';
    cmp.username = 'bob';
    cmp.password = 'pw';

    cmp.submit();

    const req = httpMock.expectOne('/api/auth/register');
    expect(req.request.body).toEqual({
      email: 'bob@example.com',
      username: 'bob',
      password: 'pw',
    });
    req.flush(null);

    expect(cmp.success).toBe(true);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('surfaces the backend error message on failure', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    const cmp = fixture.componentInstance;

    cmp.submit();
    httpMock
      .expectOne('/api/auth/register')
      .flush({ detail: 'Username taken' }, { status: 400, statusText: 'Bad Request' });

    expect(cmp.error).toBe('Username taken');
    expect(cmp.submitting).toBe(false);
    expect(cmp.success).toBe(false);
  });

  it('falls back to a generic error message when the backend gives none', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    const cmp = fixture.componentInstance;

    cmp.submit();
    httpMock.expectOne('/api/auth/register').flush('', { status: 500, statusText: 'Server Error' });

    expect(cmp.error).toBe('Failed to register. Please try again later.');
  });

  it('shows the success message instead of the form once registered', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.componentInstance.success = true;
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Registered—now log in.');
    expect(el.querySelector('form')).toBeNull();
  });
});
