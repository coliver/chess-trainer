import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

type VerificationState = 'loading' | 'success' | 'error';

/** Angular counterpart of react/src/pages/VerifyEmail.tsx. */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterLink, TranslatePipe],
  template: `
    <main class="page">
      <div class="card">
        @switch (state()) {
          @case ('loading') {
            <h1 class="title" style="margin-bottom: 6px">
              {{ 'auth.verifyEmail.loadingTitle' | translate }}
            </h1>
            <p class="subtitle">{{ 'auth.verifyEmail.loadingSubtitle' | translate }}</p>
          }
          @case ('success') {
            <h1 class="title" style="margin-bottom: 6px">
              {{ 'auth.verifyEmail.successTitle' | translate }}
            </h1>
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
          }
          @case ('error') {
            <h1 class="title" style="margin-bottom: 6px">
              {{ 'auth.verifyEmail.errorTitle' | translate }}
            </h1>
            <p class="subtitle">{{ 'auth.verifyEmail.errorSubtitle' | translate }}</p>
            <p style="margin-top: 20px">
              <a routerLink="/login" class="btn" style="display: inline-block">
                {{ 'auth.verifyEmail.returnToLogin' | translate }}
              </a>
            </p>
          }
        }
      </div>
    </main>
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
