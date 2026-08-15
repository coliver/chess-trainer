import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoardComponent } from '../training/board.component';
import { uciListToMoves, previewFen } from '@knight-school/chess-core';
import { Opening } from '../../core/openings.service';

/**
 * Board preview panel with ply stepper. Displays the selected opening's
 * position at a given ply (move index), with buttons to step through the moves.
 */
@Component({
  selector: 'app-board-preview',
  standalone: true,
  imports: [CommonModule, BoardComponent],
  template: `
    <div class="boardPreview" #container>
      <div class="boardPreview-board" [style.width.px]="sizePx">
        <app-board
          *ngIf="opening"
          [position]="previewPosition"
          [interactive]="false"
          [showCoordinates]="false"
        ></app-board>
      </div>

      <div class="ply-stepper">
        <button
          type="button"
          class="ply-btn"
          [class.active]="selectedPly === 0"
          (click)="selectedPly = 0"
        >
          Start
        </button>

        <button
          *ngFor="let uci of moveList; let idx = index"
          type="button"
          class="ply-btn"
          [class.active]="selectedPly === idx + 1"
          [title]="'After ply ' + (idx + 1)"
          (click)="selectedPly = idx + 1"
        >
          {{ uci }}
        </button>
      </div>
    </div>
  `,
  styles: [],
})
export class BoardPreviewComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;

  @Input({ required: true }) openings!: Opening[];
  @Input() selectedOpeningName: string | null = null;

  private _selectedPly = 0;
  sizePx = 280;
  opening: Opening | null = null;
  moveList: string[] = [];

  private resizeObserver: ResizeObserver | null = null;

  get selectedPly(): number {
    return this._selectedPly;
  }

  set selectedPly(value: number) {
    this._selectedPly = value;
  }

  get previewPosition(): string {
    return previewFen(this.opening, this._selectedPly);
  }

  ngAfterViewInit(): void {
    this.setupResizeObserver();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedOpeningName'] || changes['openings']) {
      this.updateOpening();
      this.updateMoveList();
      // Default to the final ply when the opening changes, so the preview
      // opens showing the completed line, not the start position.
      if (changes['selectedOpeningName']?.currentValue !== changes['selectedOpeningName']?.previousValue) {
        this._selectedPly = this.moveList.length;
      }
      return;
    }
    this.updateMoveList();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private setupResizeObserver(): void {
    const el = this.containerRef?.nativeElement;
    if (!el) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const w = entry.contentRect.width;
      const scale = 0.85;
      this.sizePx = Math.max(180, Math.floor(w * scale));
    });

    this.resizeObserver.observe(el);
  }

  private updateOpening(): void {
    this.opening =
      this.openings.find((o) => o.name === this.selectedOpeningName) ?? null;
  }

  private updateMoveList(): void {
    this.moveList = uciListToMoves(this.opening?.uci_moves);
  }
}
