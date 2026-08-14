import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Opening } from '../../core/openings.service';
import { variationLabelOf } from '../../lib/group-openings';

/**
 * Level-2 list: the variations of a single base opening, as lightweight rows
 * (ECO chip + label). No per-row board — selecting a row drives the shared
 * preview panel. `rows` is expected to lead with the base's root line.
 */
@Component({
  selector: 'app-variation-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="variation-rows" role="list">
      <button
        *ngFor="let o of rows; trackBy: trackByRow"
        type="button"
        role="listitem"
        class="variation-row"
        [class.selected]="selectedName === o.name"
        [attr.aria-pressed]="selectedName === o.name"
        (click)="pick.emit(o)"
      >
        <span class="r-eco">{{ o.eco }}</span>
        <span class="r-name">{{ variationLabelOf(o.name) }}</span>
      </button>
    </div>
  `,
  styles: [],
})
export class VariationListComponent {
  @Input({ required: true }) rows!: Opening[];
  @Input() selectedName: string | null = null;
  @Output() pick = new EventEmitter<Opening>();

  variationLabelOf = variationLabelOf;

  trackByRow(index: number, o: Opening): string {
    return o.eco + o.name;
  }
}
