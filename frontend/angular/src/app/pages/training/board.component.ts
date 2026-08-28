import {
  AfterViewInit,
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  Chessboard,
  COLOR,
  INPUT_EVENT_TYPE,
  BORDER_TYPE,
  MoveInputEvent,
} from 'cm-chessboard/src/Chessboard.js';
import {
  Markers,
  MARKER_TYPE,
} from 'cm-chessboard/src/extensions/markers/Markers.js';

// Sprites are served from angular/public (copied from the cm-chessboard package);
// the app is served under /angular/.
const ASSETS_URL = '/angular/cm-chessboard-assets/';

export type BoardMarkerKind = 'hint' | 'blink' | 'lastmove';
export interface BoardMarker {
  square: string;
  type: BoardMarkerKind;
}

// Custom marker types (styled in styles.css). Stable object refs so
// removeMarkers(type) matches them by identity.
const CUSTOM_MARKER: Record<
  BoardMarkerKind,
  { class: string; slice: string }
> = {
  hint: { class: 'marker-square-hint', slice: 'markerSquare' },
  blink: { class: 'marker-square-blink', slice: 'markerSquare' },
  lastmove: { class: 'marker-square-lastmove', slice: 'markerSquare' },
};

/**
 * Angular wrapper around cm-chessboard — the mirror of the React
 * `Board` component. Drag and click both funnel through `validateMoveInput`
 * into the `onMove` callback (chess.js stays the source of truth upstream).
 */
@Component({
  selector: 'app-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div #host class="board-host"></div>`,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class BoardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('host', { static: true })
  hostRef!: ElementRef<HTMLDivElement>;

  @Input() position = '';
  @Input() orientation: 'white' | 'black' = 'white';
  @Input() interactive = false;
  @Input() animated = true;
  @Input() showCoordinates = true;
  @Input() moveColor: 'white' | 'black' = 'white';
  @Input() markers: BoardMarker[] = [];
  @Input() getLegalMoves?: (
    square: string,
  ) => { to: string; promotion?: string }[];
  @Input() onMoveStart?: (square: string) => boolean;
  @Input() onMove?: (from: string, to: string) => boolean;

  private board: Chessboard | null = null;

  ngAfterViewInit(): void {
    this.board = new Chessboard(this.hostRef.nativeElement, {
      position: this.position,
      orientation: this.orientation === 'black' ? COLOR.black : COLOR.white,
      responsive: true,
      assetsUrl: ASSETS_URL,
      style: {
        cssClass: 'default',
        showCoordinates: this.showCoordinates,
        borderType: BORDER_TYPE.none,
        animationDuration: this.animated ? 300 : 0,
      },
      extensions: [
        { class: Markers, props: { autoMarkers: MARKER_TYPE['frame'] } },
      ],
    });
    if (this.interactive) this.enableInput();
    this.applyMarkers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const board = this.board;
    if (!board) return;

    if (changes['position']) {
      const desired = this.position.split(' ')[0];
      const current = board.getPosition()?.split(' ')[0];
      if (desired !== current) void board.setPosition(this.position, this.animated);
    }
    if (changes['orientation']) {
      const desired = this.orientation === 'black' ? COLOR.black : COLOR.white;
      if (board.getOrientation() !== desired) {
        void board.setOrientation(desired, false);
      }
    }
    if (changes['markers']) this.applyMarkers();
    if (changes['interactive'] || changes['moveColor']) {
      board.disableMoveInput();
      if (this.interactive) this.enableInput();
    }
  }

  ngOnDestroy(): void {
    this.board?.destroy();
    this.board = null;
  }

  private enableInput(): void {
    const board = this.board;
    if (!board) return;

    const handler = (event: MoveInputEvent): boolean | void => {
      switch (event.type) {
        case INPUT_EVENT_TYPE.moveInputStarted: {
          const from = event.squareFrom ?? '';
          const allowed = this.onMoveStart ? this.onMoveStart(from) : true;
          if (allowed && this.getLegalMoves) {
            board.removeLegalMovesMarkers();
            board.addLegalMovesMarkers(this.getLegalMoves(from));
          }
          return allowed;
        }
        case INPUT_EVENT_TYPE.validateMoveInput: {
          board.removeLegalMovesMarkers();
          const to = event.squareTo ?? '';
          // Landing on a friendly piece is a re-selection, not a move attempt.
          const ownPrefix = this.moveColor === 'black' ? 'b' : 'w';
          if (board.getPiece(to)?.startsWith(ownPrefix)) return false;
          return this.onMove ? this.onMove(event.squareFrom ?? '', to) : false;
        }
        case INPUT_EVENT_TYPE.moveInputCanceled:
        case INPUT_EVENT_TYPE.moveInputFinished:
          board.removeLegalMovesMarkers();
          return;
        default:
          return;
      }
    };

    board.enableMoveInput(
      handler,
      this.moveColor === 'black' ? COLOR.black : COLOR.white,
    );
  }

  private applyMarkers(): void {
    const board = this.board;
    if (!board) return;
    board.removeMarkers(CUSTOM_MARKER['hint']);
    board.removeMarkers(CUSTOM_MARKER['blink']);
    for (const m of this.markers ?? []) {
      board.addMarker(CUSTOM_MARKER[m.type], m.square);
    }
  }
}
