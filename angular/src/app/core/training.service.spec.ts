import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TrainingService } from './training.service';

describe('TrainingService', () => {
  let service: TrainingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TrainingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('POSTs to start a session for an opening, defaulting playerColor to white', () => {
    let result: unknown;
    service.start('B90', 'Sicilian Defense').subscribe((r) => (result = r));

    const req = httpMock.expectOne('/api/training-sessions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      openingEco: 'B90',
      openingName: 'Sicilian Defense',
      playerColor: 'w',
    });
    req.flush({ id: 42 });

    expect(result).toEqual({ id: 42 });
  });

  it('POSTs the chosen playerColor when starting a session as Black', () => {
    service.start('B90', 'Sicilian Defense', 'b').subscribe();

    const req = httpMock.expectOne('/api/training-sessions');
    expect(req.request.body.playerColor).toBe('b');
    req.flush({ id: 42 });
  });

  it('POSTs to start a session from due positions', () => {
    let result: unknown;
    service.startFromDue().subscribe((r) => (result = r));

    const req = httpMock.expectOne('/api/training-sessions/from-due');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ id: 7 });

    expect(result).toEqual({ id: 7 });
  });

  it('normalizes the next-item response into a TrainingItem', () => {
    let result: unknown;
    service.next('42').subscribe((r) => (result = r));

    const req = httpMock.expectOne('/api/training-sessions/42/next');
    expect(req.request.method).toBe('GET');
    req.flush({
      fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
      itemId: 'item-1',
      openingEco: 'B20',
      openingName: 'Sicilian Defense',
      correctMoveUci: 'g1f3',
    });

    expect(result).toEqual({
      fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
      itemId: 'item-1',
      openingLabel: 'B20 Sicilian Defense',
      correctMoveUci: 'g1f3',
      playerColor: 'w',
    });
  });

  it('POSTs a submitted move to the responses endpoint', () => {
    const moveResult = { correct: false, reason: 'wrong move', fenAfter: null };
    let result: unknown;
    service.submit('42', 'item-1', 'e2e4').subscribe((r) => (result = r));

    const req = httpMock.expectOne('/api/training-sessions/42/responses');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ itemId: 'item-1', moveUci: 'e2e4' });
    req.flush(moveResult);

    expect(result).toEqual(moveResult);
  });
});
