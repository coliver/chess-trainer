import { TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { BoardPreviewComponent } from './board-preview.component';
import type { Opening } from '../../core/openings.service';

function opening(overrides: Partial<Opening>): Opening {
  return {
    eco: 'B90',
    name: 'Sicilian Defense: Najdorf Variation',
    epd: '',
    pgn: '',
    uci_moves: 'e2e4 c7c5 g1f3 d7d6',
    description: '',
    ...overrides,
  };
}

describe('BoardPreviewComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoardPreviewComponent],
    }).compileComponents();
  });

  it('resolves the selected opening and its move list on changes', () => {
    const fixture = TestBed.createComponent(BoardPreviewComponent);
    const cmp = fixture.componentInstance;
    const sicilian = opening({ name: 'Sicilian Defense' });
    cmp.openings = [sicilian];
    cmp.selectedOpeningName = 'Sicilian Defense';

    cmp.ngOnChanges({
      openings: new SimpleChange(undefined, cmp.openings, true),
      selectedOpeningName: new SimpleChange(undefined, cmp.selectedOpeningName, true),
    });

    expect(cmp.opening).toBe(sicilian);
    expect(cmp.moveList).toEqual(['e2e4', 'c7c5', 'g1f3', 'd7d6']);
  });

  it('resets the ply when the selected opening name changes', () => {
    const fixture = TestBed.createComponent(BoardPreviewComponent);
    const cmp = fixture.componentInstance;
    const sicilian = opening({ name: 'Sicilian Defense' });
    const french = opening({ name: 'French Defense', uci_moves: 'e2e4 e7e6' });
    cmp.openings = [sicilian, french];
    cmp.selectedOpeningName = 'Sicilian Defense';
    cmp.ngOnChanges({
      openings: new SimpleChange(undefined, cmp.openings, true),
      selectedOpeningName: new SimpleChange(undefined, cmp.selectedOpeningName, true),
    });
    cmp.selectedPly = 2;

    cmp.selectedOpeningName = 'French Defense';
    cmp.ngOnChanges({
      selectedOpeningName: new SimpleChange('Sicilian Defense', 'French Defense', false),
    });

    expect(cmp.opening).toBe(french);
    expect(cmp.selectedPly).toBe(0);
  });

  it('exposes null opening when no match is found', () => {
    const fixture = TestBed.createComponent(BoardPreviewComponent);
    const cmp = fixture.componentInstance;
    cmp.openings = [opening({ name: 'Sicilian Defense' })];
    cmp.selectedOpeningName = 'Unknown Opening';

    cmp.ngOnChanges({
      openings: new SimpleChange(undefined, cmp.openings, true),
    });

    expect(cmp.opening).toBeNull();
    expect(cmp.moveList).toEqual([]);
  });

  it('disconnects the resize observer on destroy without error', () => {
    const fixture = TestBed.createComponent(BoardPreviewComponent);
    const cmp = fixture.componentInstance;
    expect(() => cmp.ngOnDestroy()).not.toThrow();
  });
});
