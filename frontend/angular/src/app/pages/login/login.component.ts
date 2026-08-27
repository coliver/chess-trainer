import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <div class="card">
        <h1 class="title">Login</h1>
        <p class="subtitle">Welcome back.</p>

        <form class="auth-form" (ngSubmit)="submit()">
          <label class="auth-field">
            <span class="auth-label">Username</span>
            <input
              class="text-input"
              name="username"
              [(ngModel)]="username"
              required
              autocomplete="username"
            />
          </label>

          <label class="auth-field">
            <span class="auth-label">Password</span>
            <input
              class="text-input"
              name="password"
              type="password"
              [(ngModel)]="password"
              required
              autocomplete="current-password"
            />
          </label>

          <button class="btn" type="submit" [disabled]="submitting">
            {{ submitting ? 'Submitting…' : 'Submit' }}
          </button>

          @if (error) {
            <div class="auth-error" role="alert">{{ error }}</div>
          }
        </form>

        <p class="auth-alt">
          Need an account? <a routerLink="/register">Register</a>
        </p>
      </div>
    </main>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  username = '';
  password = '';
  error: string | null = null;
  submitting = false;

  submit(): void {
    this.error = null;
    this.submitting = true;
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.error = err?.error?.detail ?? 'Failed to log in';
        this.submitting = false;
      },
    });
  }
}
