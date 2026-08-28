import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PuzzlesService } from './puzzles.service';

describe('PuzzlesService', () => {
  let service: PuzzlesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PuzzlesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs the next puzzle', () => {
    const puzzle = {
      puzzleId: 'p1',
      fen: 'startpos',
      rating: 1200,
      correctMoveUci: 'e2e4',
    };
    let result: unknown;
    service.next().subscribe((r) => (result = r));

    const req = httpMock.expectOne('/api/puzzles/next');
    expect(req.request.method).toBe('GET');
    req.flush(puzzle);

    expect(result).toEqual(puzzle);
  });

  it('POSTs a submitted move to the puzzle attempts endpoint', () => {
    const attemptResult = { correct: true, reason: 'correct' };
    let result: unknown;
    service.submit('p1', 'e2e4', 0).subscribe((r) => (result = r));

    const req = httpMock.expectOne('/api/puzzles/p1/attempts');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ moveUci: 'e2e4', moveIndex: 0 });
    req.flush(attemptResult);

    expect(result).toEqual(attemptResult);
  });

  it('GETs theme counts', () => {
    const themes = [{ theme: 'fork', count: 12 }];
    let result: unknown;
    service.themes().subscribe((r) => (result = r));

    const req = httpMock.expectOne('/api/puzzles/themes');
    expect(req.request.method).toBe('GET');
    req.flush(themes);

    expect(result).toEqual(themes);
  });
});
