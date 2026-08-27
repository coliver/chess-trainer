import { Component, EventEmitter, Output } from '@angular/core';

/**
 * Angular counterpart of react/src/components/FlipBoardButton.tsx — accumulates
 * rotation (rather than toggling 0/180) so repeated clicks keep spinning
 * forward instead of snapping back.
 */
@Component({
  selector: 'app-flip-board-button',
  standalone: true,
  template: `
    <button
      type="button"
      class="btn btn-secondary"
      (click)="handleClick()"
      aria-label="Flip board"
      title="Flip board"
    >
      <span class="flip-icon" [style.transform]="'rotate(' + rotation + 'deg)'" aria-hidden="true">
        ⟳
      </span>
    </button>
  `,
})
export class FlipBoardButtonComponent {
  @Output() flip = new EventEmitter<void>();

  private turns = 0;
  rotation = 0;

  handleClick(): void {
    this.turns += 1;
    this.rotation = this.turns * 180;
    this.flip.emit();
  }
}
