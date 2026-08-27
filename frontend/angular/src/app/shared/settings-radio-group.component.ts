import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

export interface SettingsRadioOption {
  value: string;
  label: string;
}

/** Angular counterpart of react/src/components/SettingsRadioGroup.tsx. */
@Component({
  selector: 'app-settings-radio-group',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [NgTemplateOutlet],
  template: `
    @if (rowLabel) {
      <div class="settings-row">
        <span class="settings-row-label">{{ rowLabel }}</span>
        <ng-container [ngTemplateOutlet]="group" />
      </div>
    } @else {
      <ng-container [ngTemplateOutlet]="group" />
    }

    <ng-template #group>
      <div
        class="settings-radio-group"
        [class.settings-radio-group--stacked]="stacked"
        role="radiogroup"
        [attr.aria-label]="ariaLabel"
      >
        @for (option of options; track option.value) {
          <label class="settings-radio">
            <input
              type="radio"
              [name]="name"
              [value]="option.value"
              [checked]="value === option.value"
              (change)="valueChange.emit(option.value)"
            />
            {{ option.label }}
          </label>
        }
      </div>
    </ng-template>
  `,
})
export class SettingsRadioGroupComponent {
  @Input({ required: true }) name = '';
  @Input({ required: true }) ariaLabel = '';
  @Input() rowLabel?: string;
  @Input() stacked = false;
  @Input({ required: true }) value = '';
  @Input({ required: true }) options: SettingsRadioOption[] = [];
  @Output() valueChange = new EventEmitter<string>();
}
