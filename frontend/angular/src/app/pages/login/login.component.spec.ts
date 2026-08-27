import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { TranslateService } from '../../core/i18n/translate.service';
import { stubTranslate } from '../../core/i18n/testing';

describe('LoginComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    stubTranslate(TestBed.inject(TranslateService), {
      'auth.login.title': 'Login',
      'auth.login.submit': 'Submit',
      'auth.login.submitting': 'Submitting…',
      'auth.login.emailNotVerified': 'Please verify your email before logging in',
      'auth.login.resendVerification': 'Resend verification email',
      'auth.login.resendSending': 'Sending...',
      'auth.login.resendSent': 'Sent!',
      'auth.login.errorLoginFailed': 'Failed to Login',
      'auth.login.errorResendFailed': 'Failed to resend verification email',
    });
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('navigates to /dashboard on a successful login', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const navigateSpy = spyOn(router, 'navigate');
    const cmp = fixture.componentInstance;
    cmp.username = 'bob';
    cmp.password = 'pw';

    cmp.submit();

    httpMock.expectOne('/api/auth/login').flush({
      id: 1,
      email: 'bob@example.com',
      username: 'bob',
      access_token: 'AT',
      refresh_token: 'RT',
    });

    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
    expect(cmp.error).toBeNull();
  });

  it('surfaces the backend error message and stops submitting on failure', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const cmp = fixture.componentInstance;
    cmp.username = 'bob';
    cmp.password = 'wrong';

    cmp.submit();
    expect(cmp.submitting).toBe(true);

    httpMock
      .expectOne('/api/auth/login')
      .flush({ detail: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(cmp.error).toBe('Invalid credentials');
    expect(cmp.submitting).toBe(false);
    expect(cmp.emailNotVerified).toBe(false);
  });

  it('falls back to a translated generic error message when the backend gives none', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const cmp = fixture.componentInstance;
    cmp.submit();

    httpMock.expectOne('/api/auth/login').flush('', { status: 500, statusText: 'Server Error' });

    expect(cmp.error).toBe('Failed to Login');
  });

  it('shows the resend-verification prompt on a 403 "Email not verified" response', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const cmp = fixture.componentInstance;
    cmp.username = 'bob';
    cmp.password = 'pw';

    cmp.submit();
    httpMock
      .expectOne('/api/auth/login')
      .flush({ detail: 'Email not verified' }, { status: 403, statusText: 'Forbidden' });

    expect(cmp.emailNotVerified).toBe(true);
    expect(cmp.error).toBeNull();
  });

  it('resends the verification email and shows a confirmation', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const cmp = fixture.componentInstance;
    cmp.username = 'bob';
    cmp.emailNotVerified = true;

    cmp.resendVerification();
    expect(cmp.resendingVerification).toBe(true);

    httpMock.expectOne('/api/auth/resend-verification').flush(null);

    expect(cmp.resendingVerification).toBe(false);
    expect(cmp.verificationSent).toBe(true);
  });

  it('renders the form and reflects submitting state in the button label', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('Login');

    fixture.componentInstance.submitting = true;
    fixture.detectChanges();
    expect(el.querySelector('button[type="submit"]')?.textContent).toContain('Submitting');
  });
});
