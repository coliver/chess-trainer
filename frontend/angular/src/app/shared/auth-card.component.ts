import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

/** Angular counterpart of react/src/components/AuthCard.tsx. */
@Component({
  selector: 'app-auth-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="page">
      <div class="card" style="max-width: 520px; margin-top: 20px">
        @if (title) {
          <h1 class="title" style="margin-bottom: 6px">{{ title }}</h1>
        }
        @if (subtitle) {
          <p class="subtitle">{{ subtitle }}</p>
        }
        <ng-content></ng-content>
      </div>
    </main>
  `,
})
export class AuthCardComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
}
