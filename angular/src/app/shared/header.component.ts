import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { KnightSchoolIconComponent } from './knight-school-icon.component';
import { ThemeToggleComponent } from './theme-toggle.component';

/**
 * Angular counterpart of react/src/components/Header.tsx — same brand,
 * greeting, login/register/logout icon buttons, GitHub link, and theme
 * toggle, reusing the shared header.css ported from React.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, KnightSchoolIconComponent, ThemeToggleComponent],
  template: `
    <header class="site-header">
      <div class="site-header-inner">
        <div class="site-header-brand">
          <app-knight-school-icon height="64px" className="site-header-logo" />
          <a routerLink="/dashboard" class="site-header-title">Knight&nbsp;School</a>
        </div>

        <div class="site-header-right">
          <div role="heading" aria-level="2" class="site-header-greeting">{{ greeting }}</div>

          <nav class="site-header-nav" aria-label="Primary">
            @if (auth.isLoggedIn) {
              <a routerLink="/dashboard" class="site-header-nav-link">Openings</a>
              <a routerLink="/puzzles" class="site-header-nav-link">Puzzles</a>
            }
            @if (!auth.isLoggedIn) {
              <a routerLink="/login" class="site-header-profile-link" aria-label="Login" title="Login">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              </a>
              <a routerLink="/register" class="site-header-profile-link" aria-label="Register" title="Register">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="17" y1="11" x2="23" y2="11" />
                </svg>
              </a>
            } @else {
              <button
                class="site-header-profile-link"
                type="button"
                (click)="onLogout()"
                aria-label="Logout"
                title="Logout"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            }

            <div class="site-header-actions">
              <a
                href="https://github.com/coliver/chess-trainer"
                class="site-header-profile-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View source on GitHub"
                title="View source on GitHub"
              >
                <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path
                    d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
                  />
                </svg>
              </a>
              <app-theme-toggle />
            </div>
          </nav>
        </div>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  get greeting(): string {
    const hour = new Date().getHours();
    const base = hour < 12 ? 'Good morning ☀️' : hour < 18 ? 'Good afternoon 🌤️' : 'Good evening 🌙';
    const who = this.auth.username ? `, ${this.auth.username}` : '';
    return `${base}${who}`;
  }

  onLogout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
