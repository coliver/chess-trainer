import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { OpeningsService, Opening } from './openings.service';

describe('OpeningsService', () => {
  let service: OpeningsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OpeningsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs /api/openings and returns the list', () => {
    const openings: Opening[] = [
      {
        eco: 'B90',
        name: 'Sicilian Defense: Najdorf Variation',
        epd: 'startpos',
        pgn: '',
        uci_moves: 'e2e4 c7c5',
        description: '',
      },
    ];

    let result: Opening[] | undefined;
    service.getOpenings().subscribe((r) => (result = r));

    const req = httpMock.expectOne('/api/openings');
    expect(req.request.method).toBe('GET');
    req.flush(openings);

    expect(result).toEqual(openings);
  });
});
