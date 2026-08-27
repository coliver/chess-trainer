import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <div class="card">
        <h1 class="title">Register</h1>
        <p class="subtitle">Create your account.</p>

        @if (success) {
          <p>Registered—now log in.</p>
        } @else {
          <form class="auth-form" (ngSubmit)="submit()">
            <label class="auth-field">
              <span class="auth-label">Email</span>
              <input
                class="text-input"
                name="email"
                type="email"
                [(ngModel)]="email"
                required
                autocomplete="email"
              />
            </label>

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
                autocomplete="new-password"
              />
            </label>

            <button class="btn" type="submit" [disabled]="submitting">
              {{ submitting ? 'Registering…' : 'Register' }}
            </button>

            @if (error) {
              <div class="auth-error">{{ error }}</div>
            }
          </form>
        }

        <p class="auth-alt">
          Already have an account? <a routerLink="/login">Login</a>
        </p>
      </div>
    </main>
  `,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  username = '';
  password = '';
  error: string | null = null;
  success = false;
  submitting = false;

  submit(): void {
    this.error = null;
    this.submitting = true;
    this.auth.register(this.email, this.username, this.password).subscribe({
      next: () => {
        this.success = true;
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.error = err?.error?.detail ?? 'Failed to register. Please try again later.';
        this.submitting = false;
      },
    });
  }
}
