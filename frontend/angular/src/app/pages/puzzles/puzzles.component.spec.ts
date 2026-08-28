import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { PuzzlesComponent } from './puzzles.component';
import { TranslateService } from '../../core/i18n/translate.service';
import { stubTranslate } from '../../core/i18n/testing';

describe('PuzzlesComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PuzzlesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    stubTranslate(TestBed.inject(TranslateService), {
      'puzzles.noPuzzlesDue': 'No puzzles due right now — check back later.',
      'puzzles.loadFailed': 'Failed to load a puzzle. Check your connection.',
      'puzzles.correct': '✅ Correct!',
      'puzzles.incorrectFallback': 'Not quite — try again.',
      'puzzles.submitError': 'Error submitting move.',
    });
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(PuzzlesComponent);
    return fixture.componentInstance;
  }

  it('loads the next puzzle on init', () => {
    const cmp = create();
    cmp.ngOnInit();

    httpMock.expectOne('/api/puzzles/next').flush({
      puzzleId: 'p1',
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      correctMoveUci: 'e7e5',
      rating: 1200,
    });

    expect(cmp.puzzleId).toBe('p1');
    expect(cmp.rating).toBe(1200);
    expect(cmp.feedback).toBe('');
  });

  it('redirects to /login when loading the next puzzle 401s', () => {
    const cmp = create();
    const navigateSpy = spyOn(router, 'navigate');
    cmp.ngOnInit();

    httpMock.expectOne('/api/puzzles/next').flush('nope', { status: 401, statusText: 'Unauthorized' });

    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('shows a no-puzzles-due message on 404', () => {
    const cmp = create();
    cmp.ngOnInit();

    httpMock.expectOne('/api/puzzles/next').flush('none', { status: 404, statusText: 'Not Found' });

    expect(cmp.noPuzzlesDue).toBe(true);
    expect(cmp.puzzleId).toBeNull();
    expect(cmp.feedback).toContain('No puzzles due');
  });

  it('auto-orients the board to the solver color when a puzzle loads', () => {
    const cmp = create();
    cmp.ngOnInit();

    httpMock.expectOne('/api/puzzles/next').flush({
      puzzleId: 'p1',
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      correctMoveUci: 'e7e5',
      rating: 1200,
    });

    expect(cmp.orientation).toBe('black');
  });

  it('flips the board orientation', () => {
    const cmp = create();
    expect(cmp.orientation).toBe('white');
    cmp.flipBoard();
    expect(cmp.orientation).toBe('black');
    cmp.flipBoard();
    expect(cmp.orientation).toBe('white');
  });

  it('submits a move and tracks streak on a correct answer', () => {
    const cmp = create();
    cmp.ngOnInit();
    httpMock.expectOne('/api/puzzles/next').flush({
      puzzleId: 'p1',
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      correctMoveUci: 'e7e5',
      rating: 1200,
    });

    const moved = cmp.onMove('e7', 'e5');
    expect(moved).toBe(true);
    expect(cmp.isSubmitting).toBe(true);

    httpMock.expectOne('/api/puzzles/p1/attempts').flush({ correct: true, reason: '' });

    expect(cmp.solved).toBe(1);
    expect(cmp.streak).toBe(1);
    expect(cmp.bestStreak).toBe(1);
    expect(cmp.feedback).toContain('Correct');
  });

  it('reverts the board and resets streak on an incorrect answer', () => {
    const cmp = create();
    cmp.ngOnInit();
    const startFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    httpMock.expectOne('/api/puzzles/next').flush({
      puzzleId: 'p1',
      fen: startFen,
      correctMoveUci: 'e7e5',
      rating: 1200,
    });
    cmp.streak = 3;

    cmp.onMove('d7', 'd5');
    httpMock.expectOne('/api/puzzles/p1/attempts').flush({ correct: false, reason: 'Not the best move' });

    expect(cmp.streak).toBe(0);
    expect(cmp.fen).toBe(startFen);
    expect(cmp.feedback).toContain('Not the best move');
  });

  it('rejects moves for the opponent color via canPickUp', () => {
    const cmp = create();
    cmp.ngOnInit();
    httpMock.expectOne('/api/puzzles/next').flush({
      puzzleId: 'p1',
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      correctMoveUci: 'e7e5',
      rating: 1200,
    });

    expect(cmp.onMoveStart('e2')).toBe(false);
    expect(cmp.onMoveStart('e7')).toBe(true);
  });

  it('skips the current puzzle and resets streak', () => {
    const cmp = create();
    cmp.ngOnInit();
    httpMock.expectOne('/api/puzzles/next').flush({
      puzzleId: 'p1',
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      correctMoveUci: 'e7e5',
      rating: 1200,
    });
    cmp.streak = 5;

    cmp.skip();

    expect(cmp.streak).toBe(0);
    httpMock.expectOne('/api/puzzles/next').flush({
      puzzleId: 'p2',
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      correctMoveUci: 'e7e5',
      rating: 1200,
    });
    expect(cmp.puzzleId).toBe('p2');
  });
});
