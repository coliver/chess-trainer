import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AuthCardComponent } from '../../shared/auth-card.component';

type VerificationState = 'loading' | 'success' | 'error';

/** Angular counterpart of react/src/pages/VerifyEmail.tsx. */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterLink, TranslatePipe, AuthCardComponent],
  template: `
    @switch (state()) {
      @case ('loading') {
        <app-auth-card
          [title]="'auth.verifyEmail.loadingTitle' | translate"
          [subtitle]="'auth.verifyEmail.loadingSubtitle' | translate"
        ></app-auth-card>
      }
      @case ('success') {
        <app-auth-card [title]="'auth.verifyEmail.successTitle' | translate">
          <p class="subtitle">
            @if (email(); as verifiedEmail) {
              {{ 'auth.verifyEmail.successSubtitleWithEmail' | translate: { email: verifiedEmail } }}
            } @else {
              {{ 'auth.verifyEmail.successSubtitleNoEmail' | translate }}
            }
          </p>
          <p style="margin-top: 20px">
            <a routerLink="/login" class="btn" style="display: inline-block">
              {{ 'auth.verifyEmail.goToLogin' | translate }}
            </a>
          </p>
        </app-auth-card>
      }
      @case ('error') {
        <app-auth-card
          [title]="'auth.verifyEmail.errorTitle' | translate"
          [subtitle]="'auth.verifyEmail.errorSubtitle' | translate"
        >
          <p style="margin-top: 20px">
            <a routerLink="/login" class="btn" style="display: inline-block">
              {{ 'auth.verifyEmail.returnToLogin' | translate }}
            </a>
          </p>
        </app-auth-card>
      }
    }
  `,
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  readonly state = signal<VerificationState>('loading');
  readonly email = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('error');
      return;
    }

    this.auth.verifyEmail(token).subscribe({
      next: (data) => {
        this.email.set(data.email);
        this.state.set('success');
      },
      error: () => this.state.set('error'),
    });
  }
}
