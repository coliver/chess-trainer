import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TranslateService } from '../../core/i18n/translate.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <main class="page">
      <div class="card">
        <h1 class="title">{{ 'auth.login.title' | translate }}</h1>
        <p class="subtitle">{{ 'auth.login.subtitle' | translate }}</p>

        <form class="auth-form" (ngSubmit)="submit()">
          <label class="auth-field">
            <span class="auth-label">{{ 'auth.login.usernameLabel' | translate }}</span>
            <input
              class="text-input"
              name="username"
              [(ngModel)]="username"
              required
              autocomplete="username"
            />
          </label>

          <label class="auth-field">
            <span class="auth-label">{{ 'auth.login.passwordLabel' | translate }}</span>
            <input
              class="text-input"
              name="password"
              type="password"
              [(ngModel)]="password"
              required
              autocomplete="current-password"
            />
          </label>

          <button class="btn" type="submit" [disabled]="submitting" style="margin-top: 14px">
            {{ (submitting ? 'auth.login.submitting' : 'auth.login.submit') | translate }}
          </button>

          @if (emailNotVerified) {
            <div style="margin-top: 14px">
              <div class="auth-error" role="alert">
                {{ 'auth.login.emailNotVerified' | translate }}
              </div>
              <button
                class="btn"
                type="button"
                [disabled]="resendingVerification || verificationSent"
                (click)="resendVerification()"
                style="margin-top: 10px"
                [style.opacity]="verificationSent ? 0.6 : 1"
              >
                {{
                  (verificationSent
                    ? 'auth.login.resendSent'
                    : resendingVerification
                      ? 'auth.login.resendSending'
                      : 'auth.login.resendVerification'
                  ) | translate
                }}
              </button>
            </div>
          }

          @if (error) {
            <div class="auth-error" role="alert">{{ error }}</div>
          }
        </form>

        <p class="auth-alt">
          {{ 'auth.login.needAccount' | translate }}
          <a routerLink="/register">{{ 'auth.login.registerLink' | translate }}</a>
        </p>
      </div>
    </main>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  username = '';
  password = '';
  error: string | null = null;
  submitting = false;
  emailNotVerified = false;
  resendingVerification = false;
  verificationSent = false;

  submit(): void {
    this.error = null;
    this.emailNotVerified = false;
    this.submitting = true;
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err: HttpErrorResponse) => {
        if (err.status === 403 && err.error?.detail === 'Email not verified') {
          this.emailNotVerified = true;
        } else {
          this.error = err?.error?.detail || this.translate.t('auth.login.errorLoginFailed');
        }
        this.submitting = false;
      },
    });
  }

  resendVerification(): void {
    this.resendingVerification = true;
    this.verificationSent = false;
    this.auth.resendVerification(this.username).subscribe({
      next: () => {
        this.resendingVerification = false;
        this.verificationSent = true;
        setTimeout(() => (this.verificationSent = false), 3000);
      },
      error: (err: HttpErrorResponse) => {
        this.error = err?.error?.detail || this.translate.t('auth.login.errorResendFailed');
        this.resendingVerification = false;
      },
    });
  }
}
