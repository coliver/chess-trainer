import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Opening } from '../../core/openings.service';
import { variationLabelOf, groupVariations, subVariationLabelOf } from '../../lib/group-openings';
import type { VariationGroup } from '../../lib/group-openings';

/**
 * Level-2 list: the variations of a single base opening, as lightweight rows
 * (ECO chip + label). No per-row board — selecting a row drives the shared
 * preview panel. `rows` is expected to lead with the base's root line.
 *
 * Some bases have hundreds of variations, so rows sharing a sub-variation
 * (e.g. "Najdorf Variation, 6.Be3" / "…, 6.Bg5") are clustered under a
 * collapsible header instead of dumped as one flat list.
 */
@Component({
  selector: 'app-variation-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="variation-rows" role="list">
      <ng-container *ngFor="let g of groups; trackBy: trackByGroup">
        <!-- Single-row group: render as plain row -->
        <button
          *ngIf="g.rows.length === 1"
          type="button"
          role="listitem"
          class="variation-row"
          [class.selected]="selectedKey === g.rows[0].eco + g.rows[0].name"
          [attr.aria-pressed]="selectedKey === g.rows[0].eco + g.rows[0].name"
          (click)="pick.emit(g.rows[0])"
        >
          <span class="r-eco">{{ g.rows[0].eco }}</span>
          <span class="r-name">{{ variationLabelOf(g.rows[0].name) }}</span>
        </button>

        <!-- Multi-row group: collapsible -->
        <div *ngIf="g.rows.length > 1" class="variation-group">
          <button
            type="button"
            class="variation-group-header"
            (click)="toggle(g.label)"
            [attr.aria-expanded]="isOpen(g)"
          >
            <span class="vg-caret" aria-hidden="true">
              {{ isOpen(g) ? '▾' : '▸' }}
            </span>
            <span class="vg-label">{{ g.label }}</span>
            <span class="vg-count">{{ g.rows.length }}</span>
          </button>
          <div
            *ngIf="isOpen(g)"
            class="variation-group-rows"
            role="list"
          >
            <button
              *ngFor="let o of g.rows; trackBy: trackByRow"
              type="button"
              role="listitem"
              class="variation-row"
              [class.selected]="selectedKey === o.eco + o.name"
              [attr.aria-pressed]="selectedKey === o.eco + o.name"
              (click)="pick.emit(o)"
            >
              <span class="r-eco">{{ o.eco }}</span>
              <span class="r-name">{{ subVariationLabelOf(o.name) }}</span>
            </button>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [],
})
export class VariationListComponent {
  @Input({ required: true }) rows!: Opening[];
  @Input() selectedKey: string | null = null;
  @Output() pick = new EventEmitter<Opening>();

  variationLabelOf = variationLabelOf;
  subVariationLabelOf = subVariationLabelOf;

  protected expanded = new Set<string>();

  get groups(): VariationGroup[] {
    return groupVariations(this.rows);
  }

  toggle(label: string): void {
    if (this.expanded.has(label)) {
      this.expanded.delete(label);
    } else {
      this.expanded.add(label);
    }
  }

  isOpen(g: VariationGroup): boolean {
    return this.expanded.has(g.label) || g.rows.some(o => o.eco + o.name === this.selectedKey);
  }

  trackByGroup(index: number, g: VariationGroup): string {
    return g.label;
  }

  trackByRow(index: number, o: Opening): string {
    return o.eco + o.name;
  }
}
