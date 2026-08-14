import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoardComponent } from '../training/board.component';
import { previewFen, uciListToMoves } from '@knight-school/chess-core';
import type { OpeningGroup } from '../../lib/group-openings';

/**
 * A base-opening card: board thumbnail (of the line's resulting position),
 * full name, variation count, and an ECO chip. The board is a real cm-chessboard
 * but is only mounted once the card scrolls near the viewport, so a grid of ~149
 * cards does not spin up 149 boards at once.
 */
@Component({
  selector: 'app-opening-card',
  standalone: true,
  imports: [CommonModule, BoardComponent],
  template: `
    <button
      #hostBtn
      type="button"
      class="opening-card"
      [class.selected]="selected"
      [attr.aria-pressed]="selected"
      (click)="cardSelect.emit()"
    >
      <div class="oc-thumb">
        <app-board
          *ngIf="boardVisible"
          [position]="fen"
          [interactive]="false"
          [showCoordinates]="false"
          [animated]="false"
        ></app-board>
        <div *ngIf="!boardVisible" class="oc-thumb-ph" aria-hidden="true"></div>
      </div>
      <div class="oc-name">{{ group.base }}</div>
      <div class="oc-foot">
        <span class="oc-count">
          {{ group.count }} variation{{ group.count === 1 ? '' : 's' }}
        </span>
        <span class="eco-chip">{{ group.eco }}</span>
      </div>
    </button>
  `,
  styles: [],
})
export class OpeningCardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('hostBtn') hostBtn!: ElementRef<HTMLButtonElement>;

  @Input({ required: true }) group!: OpeningGroup;
  @Input() selected = false;
  @Output() cardSelect = new EventEmitter<void>();

  boardVisible = false;
  fen = '';

  private intersectionObserver: IntersectionObserver | null = null;

  ngAfterViewInit(): void {
    const el = this.hostBtn.nativeElement;
    if (!el || this.boardVisible) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.boardVisible = true;
          this.intersectionObserver?.disconnect();
        }
      },
      { rootMargin: '250px' }
    );

    this.intersectionObserver.observe(el);
    this.updateFen();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  private updateFen(): void {
    const rep = this.group.representative;
    this.fen = previewFen(rep, uciListToMoves(rep.uci_moves).length);
  }
}
