import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TranslateService } from '../../core/i18n/translate.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AuthCardComponent } from '../../shared/auth-card.component';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, RouterLink, TranslatePipe, AuthCardComponent],
  template: `
    <app-auth-card
      [title]="'auth.register.title' | translate"
      [subtitle]="'auth.register.subtitle' | translate"
    >
        @if (success) {
          <div>
            <p [innerHTML]="successHtml"></p>
            <p class="auth-alt" style="margin-top: 20px">
              <a routerLink="/login">{{ 'auth.register.returnToLogin' | translate }}</a>
            </p>
          </div>
        } @else {
          <form class="auth-form" (ngSubmit)="submit()">
            <label class="auth-field">
              <span class="auth-label">{{ 'auth.register.emailLabel' | translate }}</span>
              <input
                class="text-input"
                name="email"
                type="email"
                [(ngModel)]="email"
                required
                autocomplete="email"
              />
              <span class="auth-hint">{{ 'auth.register.emailDisclaimer' | translate }}</span>
            </label>

            <label class="auth-field">
              <span class="auth-label">{{ 'auth.register.usernameLabel' | translate }}</span>
              <input
                class="text-input"
                name="username"
                [(ngModel)]="username"
                required
                autocomplete="username"
              />
            </label>

            <label class="auth-field">
              <span class="auth-label">{{ 'auth.register.passwordLabel' | translate }}</span>
              <input
                class="text-input"
                name="password"
                type="password"
                [(ngModel)]="password"
                required
                autocomplete="new-password"
              />
            </label>

            <label class="auth-field">
              <span class="auth-label">{{
                'auth.register.passwordConfirmLabel' | translate
              }}</span>
              <input
                class="text-input"
                name="passwordConfirm"
                type="password"
                [(ngModel)]="passwordConfirm"
                required
                autocomplete="new-password"
              />
            </label>

            <button class="btn" type="submit" [disabled]="submitting" style="margin-top: 6px">
              {{ (submitting ? 'auth.register.submitting' : 'auth.register.submit') | translate }}
            </button>

            @if (error) {
              <div class="auth-error" role="alert">{{ error }}</div>
            }
          </form>
        }

        <p class="auth-alt">
          {{ 'auth.register.haveAccount' | translate }}
          <a routerLink="/login">{{ 'auth.register.loginLink' | translate }}</a>
        </p>
    </app-auth-card>
  `,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);

  email = '';
  username = '';
  password = '';
  passwordConfirm = '';
  error: string | null = null;
  success = false;
  submitting = false;
  successHtml = '';

  submit(): void {
    this.error = null;

    if (this.password !== this.passwordConfirm) {
      this.error = this.translate.t('auth.register.passwordMismatch');
      return;
    }

    this.submitting = true;
    this.auth
      .register(this.email, this.username, this.password, this.translate.lang())
      .subscribe({
        next: () => {
          this.successHtml = this.translate.t('auth.register.successMessage', {
            email: this.email,
          });
          this.success = true;
          this.submitting = false;
        },
        error: (err: HttpErrorResponse) => {
          this.error = err?.error?.detail || this.translate.t('auth.register.errorGeneric');
          this.submitting = false;
        },
      });
  }
}
