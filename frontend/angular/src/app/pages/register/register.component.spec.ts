import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RegisterComponent } from './register.component';
import { TranslateService } from '../../core/i18n/translate.service';
import { stubTranslate } from '../../core/i18n/testing';

describe('RegisterComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    stubTranslate(TestBed.inject(TranslateService), {
      'auth.register.title': 'Register',
      'auth.register.submit': 'Register',
      'auth.register.submitting': 'Registering...',
      'auth.register.passwordMismatch': 'Passwords do not match',
      'auth.register.successMessage': 'Check your inbox at <strong>{{email}}</strong>.',
      'auth.register.returnToLogin': 'Return to login',
      'auth.register.errorGeneric': 'Failed to register. Please try again later.',
    });
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('sends the current language and shows the success message without navigating', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    const cmp = fixture.componentInstance;
    cmp.email = 'bob@example.com';
    cmp.username = 'bob';
    cmp.password = 'pw';
    cmp.passwordConfirm = 'pw';

    cmp.submit();

    const req = httpMock.expectOne('/api/auth/register');
    expect(req.request.body).toEqual({
      email: 'bob@example.com',
      username: 'bob',
      password: 'pw',
      language: 'en-US',
    });
    req.flush(null);

    expect(cmp.success).toBe(true);
    expect(cmp.successHtml).toContain('bob@example.com');
    expect(cmp.submitting).toBe(false);
  });

  it('rejects a mismatched password confirmation without calling the backend', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    const cmp = fixture.componentInstance;
    cmp.password = 'pw';
    cmp.passwordConfirm = 'different';

    cmp.submit();

    expect(cmp.error).toBe('Passwords do not match');
    expect(cmp.submitting).toBe(false);
    httpMock.expectNone('/api/auth/register');
  });

  it('surfaces the backend error message on failure', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    const cmp = fixture.componentInstance;
    cmp.password = 'pw';
    cmp.passwordConfirm = 'pw';

    cmp.submit();
    httpMock
      .expectOne('/api/auth/register')
      .flush({ detail: 'Username taken' }, { status: 400, statusText: 'Bad Request' });

    expect(cmp.error).toBe('Username taken');
    expect(cmp.submitting).toBe(false);
    expect(cmp.success).toBe(false);
  });

  it('falls back to a translated generic error message when the backend gives none', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    const cmp = fixture.componentInstance;
    cmp.password = 'pw';
    cmp.passwordConfirm = 'pw';

    cmp.submit();
    httpMock.expectOne('/api/auth/register').flush('', { status: 500, statusText: 'Server Error' });

    expect(cmp.error).toBe('Failed to register. Please try again later.');
  });

  it('shows the success message instead of the form once registered', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.componentInstance.success = true;
    fixture.componentInstance.successHtml = 'Check your inbox at <strong>bob@example.com</strong>.';
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Check your inbox at bob@example.com');
    expect(el.querySelector('strong')?.textContent).toBe('bob@example.com');
    expect(el.querySelector('form')).toBeNull();
  });
});
