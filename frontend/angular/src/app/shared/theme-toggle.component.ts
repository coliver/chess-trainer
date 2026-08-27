import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { TranslatePipe } from '../core/i18n/translate.pipe';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TranslatePipe],
  template: `
    <button
      class="theme-toggle-btn"
      type="button"
      (click)="toggle()"
      [attr.aria-label]="'theme.toggle' | translate"
      [attr.title]="'theme.toggle' | translate"
    >
      @if (theme === 'dark') {
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
        >
          <path
            d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      } @else {
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
        >
          <path
            d="M21 13.2A8.4 8.4 0 0 1 10.8 3a6.9 6.9 0 1 0 10.2 10.2Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
        </svg>
      }
    </button>
  `,
})
export class ThemeToggleComponent implements OnInit {
  theme: 'light' | 'dark' = 'light';

  ngOnInit(): void {
    // 1. Check localStorage
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      this.theme = saved;
    } else {
      // 2. Check system preference
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
      this.theme = prefersDark ? 'dark' : 'light';
    }
    // Synchronize the DOM with the current state
    document.documentElement.dataset['theme'] = this.theme;
  }

  toggle(): void {
    const next = this.theme === 'dark' ? 'light' : 'dark';
    this.theme = next;
    document.documentElement.dataset['theme'] = next;
    localStorage.setItem('theme', next);
  }
}
