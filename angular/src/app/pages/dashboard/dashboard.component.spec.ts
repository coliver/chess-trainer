import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import type { Opening } from '../../core/openings.service';

function opening(overrides: Partial<Opening>): Opening {
  return {
    eco: 'B90',
    name: 'Sicilian Defense',
    epd: '',
    pgn: '',
    uci_moves: 'e2e4 c7c5',
    description: '',
    ...overrides,
  };
}

describe('DashboardComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  function create() {
    return TestBed.createComponent(DashboardComponent).componentInstance;
  }

  function flushInit(cmp: DashboardComponent, openings: Opening[] = []) {
    cmp.ngOnInit();
    httpMock.expectOne('/api/openings').flush(openings);
    httpMock.expectOne('/api/progress/summary').flush({
      positionsSeen: 10,
      overallAccuracy: 0.75,
      mastered: 3,
      currentStreak: 2,
      longestStreak: 5,
    });
    httpMock.expectOne('/api/progress/due').flush([{ fen: 'x', correctMoveUci: 'e2e4' }]);
    httpMock.expectOne('/api/progress/weak-spots').flush([
      { attempts: 4, correctCount: 1, incorrectCount: 3, openingName: 'Sicilian Defense' },
    ]);
  }

  it('loads openings, summary, due count, and weak spots on init', () => {
    const cmp = create();
    flushInit(cmp, [opening({ name: 'Sicilian Defense' })]);

    expect(cmp.openings.length).toBe(1);
    expect(cmp.summary?.positionsSeen).toBe(10);
    expect(cmp.dueCount).toBe(1);
    expect(cmp.weakSpots.length).toBe(1);
  });

  it('computes mastery percentage from the summary', () => {
    const cmp = create();
    flushInit(cmp);
    expect(cmp.masteryPct).toBe(30);
  });

  it('returns 0 mastery when there is no summary yet', () => {
    const cmp = create();
    expect(cmp.masteryPct).toBe(0);
  });

  it('switches views between bases, variations, and search', () => {
    const cmp = create();
    flushInit(cmp, [
      opening({ name: 'Sicilian Defense' }),
      opening({ name: 'French Defense', eco: 'C00' }),
    ]);

    expect(cmp.view).toBe('bases');

    cmp.openBase(cmp.sortedGroups[0]);
    expect(cmp.view).toBe('variations');
    expect(cmp.selected).toBe(cmp.sortedGroups[0].representative);

    cmp.goHome();
    expect(cmp.view).toBe('bases');

    cmp.query = 'sicilian';
    expect(cmp.view).toBe('search');
    expect(cmp.searchMatches.length).toBe(1);
  });

  it('picks a search result and derives its base', () => {
    const cmp = create();
    const najdorf = opening({ name: 'Sicilian Defense: Najdorf Variation' });
    flushInit(cmp, [najdorf]);

    cmp.pickFromSearch(najdorf);

    expect(cmp.selected).toBe(najdorf);
    expect(cmp.activeBase).toBe('Sicilian Defense');
  });

  it('derives the start label and preview name from the selection', () => {
    const cmp = create();
    const root = opening({ name: 'Sicilian Defense' });
    const najdorf = opening({ name: 'Sicilian Defense: Najdorf Variation' });
    flushInit(cmp, [root, najdorf]);

    expect(cmp.startLabel).toBe('Choose an opening');

    cmp.selected = root;
    expect(cmp.startLabel).toBe('Start Sicilian Defense');
    expect(cmp.previewFullName).toBe('Sicilian Defense');

    cmp.selected = najdorf;
    expect(cmp.startLabel).toBe('Start Najdorf Variation');
    expect(cmp.previewFullName).toBe('Sicilian Defense: Najdorf Variation');
  });

  it('starts a training session and navigates to it', () => {
    const cmp = create();
    flushInit(cmp);
    const navigateSpy = spyOn(router, 'navigate');

    cmp.startSession('B90', 'Sicilian Defense');
    httpMock.expectOne('/api/training-sessions').flush({ id: 42 });

    expect(navigateSpy).toHaveBeenCalledWith(['/training', 42]);
  });

  it('alerts and does not navigate when starting a session fails', () => {
    const cmp = create();
    flushInit(cmp);
    const navigateSpy = spyOn(router, 'navigate');
    spyOn(window, 'alert');

    cmp.startSession('B90', 'Sicilian Defense');
    httpMock.expectOne('/api/training-sessions').flush('nope', { status: 500, statusText: 'Server Error' });

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalled();
  });

  it('starts a review session from due positions', () => {
    const cmp = create();
    flushInit(cmp);
    const navigateSpy = spyOn(router, 'navigate');

    cmp.startReviewSession();
    httpMock.expectOne('/api/training-sessions/from-due').flush({ id: 7 });

    expect(navigateSpy).toHaveBeenCalledWith(['/training', 7]);
  });

  it('resets the search page size when the query changes', () => {
    const cmp = create();
    flushInit(cmp);
    cmp.searchLimit = 999;
    cmp.onQueryChange();
    expect(cmp.searchLimit).toBe(60);
  });
});
