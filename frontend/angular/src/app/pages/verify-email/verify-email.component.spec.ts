import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { VerifyEmailComponent } from './verify-email.component';
import { TranslateService } from '../../core/i18n/translate.service';
import { stubTranslate } from '../../core/i18n/testing';

function configure(token: string | null) {
  return TestBed.configureTestingModule({
    imports: [VerifyEmailComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) },
        },
      },
    ],
  }).compileComponents();
}

describe('VerifyEmailComponent', () => {
  let httpMock: HttpTestingController;

  const stub = () =>
    stubTranslate(TestBed.inject(TranslateService), {
      'auth.verifyEmail.loadingTitle': 'Verifying...',
      'auth.verifyEmail.successTitle': 'Email Verified',
      'auth.verifyEmail.successSubtitleWithEmail': '{{email}} has been verified!',
      'auth.verifyEmail.successSubtitleNoEmail': 'Your email has been verified!',
      'auth.verifyEmail.goToLogin': 'Go to Login',
      'auth.verifyEmail.errorTitle': 'Verification Failed',
      'auth.verifyEmail.errorSubtitle': 'This verification link is invalid or expired.',
      'auth.verifyEmail.returnToLogin': 'Return to Login',
    });

  afterEach(() => httpMock.verify());

  it('shows an error immediately when there is no token', async () => {
    await configure(null);
    httpMock = TestBed.inject(HttpTestingController);
    stub();

    const fixture = TestBed.createComponent(VerifyEmailComponent);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Verification Failed');
  });

  it('shows success with the verified email on a valid token', async () => {
    await configure('TOK');
    httpMock = TestBed.inject(HttpTestingController);
    stub();

    const fixture = TestBed.createComponent(VerifyEmailComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === '/api/auth/verify-email');
    expect(req.request.params.get('token')).toBe('TOK');
    req.flush({ email: 'bob@example.com' });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Email Verified');
    expect(el.textContent).toContain('bob@example.com');
  });

  it('shows an error when the token is invalid or expired', async () => {
    await configure('BAD');
    httpMock = TestBed.inject(HttpTestingController);
    stub();

    const fixture = TestBed.createComponent(VerifyEmailComponent);
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url === '/api/auth/verify-email')
      .flush('bad token', { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Verification Failed');
  });
});
