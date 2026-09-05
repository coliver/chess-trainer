import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { TrainingComponent } from './training.component';

const WHITE_TO_MOVE_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const BLACK_TO_MOVE_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('TrainingComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function configure(sessionId: string | null = 'sess1') {
    TestBed.configureTestingModule({
      imports: [TrainingComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(sessionId ? { id: sessionId } : {}) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  }

  afterEach(() => httpMock.verify());

  function create() {
    return TestBed.createComponent(TrainingComponent).componentInstance;
  }

  it('loads the first item for the session on init', () => {
    configure();
    const cmp = create();
    cmp.ngOnInit();

    httpMock.expectOne('/api/training-sessions/sess1/next').flush({
      fen: WHITE_TO_MOVE_FEN,
      itemId: 'item1',
      openingName: 'Italian Game',
      openingEco: 'C50',
      correctMoveUci: 'e2e4',
    });

    expect(cmp.itemId).toBe('item1');
    expect(cmp.fen).toBe(WHITE_TO_MOVE_FEN);
    expect(cmp.openingName).toBe('Italian Game');
    expect(cmp.eco).toBe('C50');
  });

  it('does nothing on init when there is no session id in the route', () => {
    configure(null);
    const cmp = create();
    cmp.ngOnInit();
    httpMock.expectNone('/api/training-sessions/undefined/next');
    expect(cmp.itemId).toBeNull();
  });

  it('submits a correct move and blinks the destination square', () => {
    configure();
    const cmp = create();
    cmp.ngOnInit();
    httpMock.expectOne('/api/training-sessions/sess1/next').flush({
      fen: WHITE_TO_MOVE_FEN,
      itemId: 'item1',
      openingName: 'Italian Game',
      openingEco: 'C50',
      correctMoveUci: 'e2e4',
    });

    const moved = cmp.processMove('e2', 'e4');
    expect(moved).toBe(true);

    httpMock
      .expectOne('/api/training-sessions/sess1/responses')
      .flush({ correct: true, sessionCompleted: false });

    expect(cmp.feedback).toContain('Correct');
    expect(cmp.markers.some((m) => m.type === 'blink' && m.square === 'e4')).toBe(true);
  });

  it('marks the session completed when the backend says so', () => {
    configure();
    const cmp = create();
    cmp.ngOnInit();
    httpMock.expectOne('/api/training-sessions/sess1/next').flush({
      fen: WHITE_TO_MOVE_FEN,
      itemId: 'item1',
      openingName: 'Italian Game',
      openingEco: 'C50',
      correctMoveUci: 'e2e4',
    });

    cmp.processMove('e2', 'e4');
    httpMock
      .expectOne('/api/training-sessions/sess1/responses')
      .flush({ correct: true, sessionCompleted: true });

    expect(cmp.isSessionCompleted).toBe(true);
    expect(cmp.isAdvancing).toBe(false);
  });

  it('reverts to the pre-move fen and reports the reason on an incorrect move', () => {
    configure();
    const cmp = create();
    cmp.ngOnInit();
    httpMock.expectOne('/api/training-sessions/sess1/next').flush({
      fen: WHITE_TO_MOVE_FEN,
      itemId: 'item1',
      openingName: 'Italian Game',
      openingEco: 'C50',
      correctMoveUci: 'e2e4',
    });

    cmp.processMove('d2', 'd4');
    httpMock
      .expectOne('/api/training-sessions/sess1/responses')
      .flush({ correct: false, reason: 'Not the book move' });

    expect(cmp.fen).toBe(WHITE_TO_MOVE_FEN);
    expect(cmp.feedback).toContain('Not the book move');
  });

  it('rejects picking up black pieces when it is white to move', () => {
    configure();
    const cmp = create();
    cmp.ngOnInit();
    httpMock.expectOne('/api/training-sessions/sess1/next').flush({
      fen: WHITE_TO_MOVE_FEN,
      itemId: 'item1',
      openingName: 'Italian Game',
      openingEco: 'C50',
      correctMoveUci: 'e2e4',
    });

    expect(cmp.onMoveStart('e7')).toBe(false);
    expect(cmp.onMoveStart('e2')).toBe(true);
  });

  it('steps a two-level hint on repeated calls', () => {
    configure();
    const cmp = create();
    cmp.ngOnInit();
    httpMock.expectOne('/api/training-sessions/sess1/next').flush({
      fen: WHITE_TO_MOVE_FEN,
      itemId: 'item1',
      openingName: 'Italian Game',
      openingEco: 'C50',
      correctMoveUci: 'e2e4',
    });

    expect(cmp.hintLevel).toBe(-1);
    cmp.hint();
    expect(cmp.hintLevel).toBe(0);
    cmp.hint();
    expect(cmp.hintLevel).toBe(1);
  });

  it('auto-reveals a hint after 2 misses and an arrow after 4, mirroring the manual hint button', () => {
    configure();
    const cmp = create();
    cmp.ngOnInit();
    httpMock.expectOne('/api/training-sessions/sess1/next').flush({
      fen: WHITE_TO_MOVE_FEN,
      itemId: 'item1',
      openingName: 'Italian Game',
      openingEco: 'C50',
      correctMoveUci: 'e2e4',
    });

    const missOnce = () => {
      cmp.processMove('d2', 'd4');
      httpMock
        .expectOne('/api/training-sessions/sess1/responses')
        .flush({ correct: false, reason: 'Not the book move' });
    };

    const hasMarker = (square: string) =>
      cmp.markers.some((m) => m.square === square && m.type === 'hint');

    missOnce();
    expect(hasMarker('e2')).toBe(false);

    missOnce();
    expect(hasMarker('e2')).toBe(true);
    expect(hasMarker('e4')).toBe(false);
    expect(cmp.arrows.length).toBe(0);

    missOnce();
    expect(hasMarker('e4')).toBe(false);

    missOnce();
    expect(hasMarker('e2')).toBe(true);
    expect(hasMarker('e4')).toBe(true);
    expect(cmp.arrows).toEqual([{ from: 'e2', to: 'e4', type: 'info' }]);
  });

  it('resets the miss count and hint when the puzzle advances to the next item', () => {
    configure();
    const cmp = create();
    cmp.ngOnInit();
    httpMock.expectOne('/api/training-sessions/sess1/next').flush({
      fen: WHITE_TO_MOVE_FEN,
      itemId: 'item1',
      openingName: 'Italian Game',
      openingEco: 'C50',
      correctMoveUci: 'e2e4',
    });

    for (let i = 0; i < 4; i++) {
      cmp.processMove('d2', 'd4');
      httpMock
        .expectOne('/api/training-sessions/sess1/responses')
        .flush({ correct: false, reason: 'Not the book move' });
    }
    expect(cmp.wrongAttempts).toBe(4);

    cmp.processMove('e2', 'e4');
    httpMock
      .expectOne('/api/training-sessions/sess1/responses')
      .flush({ correct: true, sessionCompleted: false });

    expect(cmp.wrongAttempts).toBe(0);
  });

  it('jumps within the timeline and clears feedback/hint', () => {
    configure();
    const cmp = create();
    cmp.ngOnInit();
    httpMock.expectOne('/api/training-sessions/sess1/next').flush({
      fen: WHITE_TO_MOVE_FEN,
      itemId: 'item1',
      openingName: 'Italian Game',
      openingEco: 'C50',
      correctMoveUci: 'e2e4',
    });
    cmp.processMove('e2', 'e4');
    httpMock
      .expectOne('/api/training-sessions/sess1/responses')
      .flush({ correct: true, sessionCompleted: true });

    expect(cmp.timeline.fens.length).toBe(2);
    cmp.jumpToIndex(0);
    expect(cmp.fen).toBe(WHITE_TO_MOVE_FEN);
  });

  it('navigates to /dashboard on exit', () => {
    configure();
    const cmp = create();
    const navigateSpy = spyOn(router, 'navigate');
    cmp.exit();
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });

  it('flips the board orientation', () => {
    configure();
    const cmp = create();
    expect(cmp.orientation).toBe('white');
    cmp.flipBoard();
    expect(cmp.orientation).toBe('black');
  });

  it('auto-plays the opponent reply when it becomes the solver reply', fakeAsync(() => {
    configure();
    const cmp = create();
    cmp.ngOnInit();
    httpMock.expectOne('/api/training-sessions/sess1/next').flush({
      fen: BLACK_TO_MOVE_FEN,
      itemId: 'item2',
      openingName: 'Italian Game',
      openingEco: 'C50',
      correctMoveUci: 'e7e5',
    });

    httpMock.expectOne('/api/training-sessions/sess1/responses').flush({ correct: true, sessionCompleted: true });
    tick(0);

    expect(cmp.fen).not.toBe(BLACK_TO_MOVE_FEN);
  }));

  it('supports playing as Black: auto-orients, auto-plays White, and gates pickup to black pieces', fakeAsync(() => {
    configure();
    const cmp = create();
    cmp.ngOnInit();
    httpMock.expectOne('/api/training-sessions/sess1/next').flush({
      fen: WHITE_TO_MOVE_FEN,
      itemId: 'item1',
      openingName: 'Italian Game',
      openingEco: 'C50',
      correctMoveUci: 'e2e4',
      playerColor: 'b',
    });

    expect(cmp.playerColor).toBe('b');
    expect(cmp.orientation).toBe('black');

    // White's move auto-plays (opponent), and is submitted silently.
    httpMock
      .expectOne('/api/training-sessions/sess1/responses')
      .flush({ correct: true, sessionCompleted: true });
    tick(0);

    expect(cmp.fen).not.toBe(WHITE_TO_MOVE_FEN);

    // Trainee may only pick up black pieces once it is Black's turn.
    expect(cmp.onMoveStart('e7')).toBe(true);
    expect(cmp.onMoveStart('e2')).toBe(false);
  }));

  it('submits a typed move via onTextSubmit when at the latest ply', () => {
    configure();
    const cmp = create();
    cmp.ngOnInit();
    httpMock.expectOne('/api/training-sessions/sess1/next').flush({
      fen: WHITE_TO_MOVE_FEN,
      itemId: 'item1',
      openingName: 'Italian Game',
      openingEco: 'C50',
      correctMoveUci: 'e2e4',
    });

    cmp.moveInput = 'e2e4';
    cmp.onTextSubmit();

    httpMock
      .expectOne('/api/training-sessions/sess1/responses')
      .flush({ correct: true, sessionCompleted: true });
    expect(cmp.moveInput).toBe('');
  });
});
