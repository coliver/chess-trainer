import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';

/** Angular counterpart of react/src/components/SettingsToggleRow.tsx. */
@Component({
  selector: 'app-settings-toggle-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <label class="settings-row settings-row--checkbox">
      <span class="settings-row-label">{{ label }}</span>
      <span class="settings-switch">
        <input
          type="checkbox"
          role="switch"
          [checked]="checked"
          (change)="onChange($event)"
        />
        <span class="settings-switch-track" aria-hidden="true"></span>
      </span>
    </label>
  `,
})
export class SettingsToggleRowComponent {
  @Input({ required: true }) label = '';
  @Input() checked = false;
  @Output() checkedChange = new EventEmitter<boolean>();

  onChange(event: Event): void {
    this.checkedChange.emit((event.target as HTMLInputElement).checked);
  }
}
