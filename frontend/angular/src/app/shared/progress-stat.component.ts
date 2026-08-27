import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

/** Angular counterpart of react/src/components/ProgressStat.tsx. */
@Component({
  selector: 'app-progress-stat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="progress-stat" [class.progress-stat--mastery]="variant === 'mastery'">
      <span class="progress-stat-value">
        <span class="progress-stat-icon" aria-hidden="true">{{ icon }}</span>
        <ng-content></ng-content>
      </span>
      <span class="progress-stat-label">{{ label }}</span>
      <ng-content select="[stat-extra]"></ng-content>
    </div>
  `,
})
export class ProgressStatComponent {
  @Input({ required: true }) icon = '';
  @Input({ required: true }) label = '';
  @Input() variant?: 'mastery';
}
