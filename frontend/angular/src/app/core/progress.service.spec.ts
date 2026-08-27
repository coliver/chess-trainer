import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  let service: ProgressService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProgressService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs the progress summary', () => {
    const summary = {
      positionsSeen: 10,
      overallAccuracy: 0.8,
      mastered: 2,
      currentStreak: 3,
      longestStreak: 5,
    };
    let result: unknown;
    service.getSummary().subscribe((r) => (result = r));

    const req = httpMock.expectOne('/api/progress/summary');
    expect(req.request.method).toBe('GET');
    req.flush(summary);

    expect(result).toEqual(summary);
  });

  it('GETs due positions', () => {
    let result: unknown;
    service.getDue().subscribe((r) => (result = r));

    const req = httpMock.expectOne('/api/progress/due');
    expect(req.request.method).toBe('GET');
    req.flush([{ fen: 'startpos', correctMoveUci: 'e2e4' }]);

    expect(result).toEqual([{ fen: 'startpos', correctMoveUci: 'e2e4' }]);
  });

  it('GETs weak spots', () => {
    let result: unknown;
    service.getWeakSpots().subscribe((r) => (result = r));

    const req = httpMock.expectOne('/api/progress/weak-spots');
    expect(req.request.method).toBe('GET');
    req.flush([{ attempts: 4, correctCount: 1, incorrectCount: 3 }]);

    expect(result).toEqual([{ attempts: 4, correctCount: 1, incorrectCount: 3 }]);
  });
});
