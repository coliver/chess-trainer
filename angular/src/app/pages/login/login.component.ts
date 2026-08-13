import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <main class="page">
      <div class="card">
        <h1>Log in</h1>
        <p class="subtitle">Welcome back.</p>

        <form (ngSubmit)="submit()">
          <label>
            <span>Username</span>
            <input name="username" [(ngModel)]="username" required autocomplete="username" />
          </label>

          <label>
            <span>Password</span>
            <input
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
            <div class="error" role="alert">{{ error }}</div>
          }
        </form>
      </div>
    </main>
  `,
  styles: [
    `
      .page {
        display: flex;
        justify-content: center;
        padding: 2.5rem 1rem;
      }
      .card {
        width: 100%;
        max-width: 420px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 1.75rem;
      }
      h1 {
        margin: 0 0 0.25rem;
      }
      .subtitle {
        margin: 0 0 1.25rem;
        color: var(--muted);
      }
      form {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-size: 0.9rem;
      }
      input {
        padding: 0.6rem 0.7rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--bg);
        color: inherit;
        font: inherit;
      }
      .error {
        color: #dc2626;
        font-size: 0.9rem;
      }
    `,
  ],
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
