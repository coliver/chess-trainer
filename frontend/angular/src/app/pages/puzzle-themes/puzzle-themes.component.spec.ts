import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PuzzleThemesComponent } from './puzzle-themes.component';
import { TranslateService } from '../../core/i18n/translate.service';
import { stubTranslate } from '../../core/i18n/testing';

describe('PuzzleThemesComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PuzzleThemesComponent],
      providers: [
        provideRouter([{ path: 'puzzles', children: [] }]),
        provideLocationMocks(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    stubTranslate(TestBed.inject(TranslateService), {
      'puzzleThemes.eyebrow': 'Puzzles',
      'puzzleThemes.title': 'Puzzle Themes',
      'puzzleThemes.subtitle': 'Pick a tactic to practice.',
      'puzzleThemes.randomPuzzle': 'Random puzzle',
      'puzzleThemes.groupMotifs': 'Motifs',
      'puzzleThemes.groupMates': 'Mates',
      'puzzleThemes.cardCount': '{{count}} puzzles',
    });
  });

  it('renders only groups that have counted themes, sized by their count', () => {
    const fixture = TestBed.createComponent(PuzzleThemesComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/puzzles/themes').flush([
      { theme: 'fork', count: 12 },
      { theme: 'backRankMate', count: 3 },
    ]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const groupTitles = Array.from(el.querySelectorAll('.puzzle-theme-group-title')).map(
      (n) => n.textContent,
    );
    expect(groupTitles).toEqual(['Motifs', 'Mates']);
    expect(el.querySelectorAll('.puzzle-theme-card').length).toBe(2);
    expect(el.textContent).toContain('12 puzzles');
  });

  it('renders no groups when no theme counts are available', () => {
    const fixture = TestBed.createComponent(PuzzleThemesComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/puzzles/themes').flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.puzzle-theme-group').length).toBe(0);
  });

  it('navigates to /puzzles on the random puzzle button', () => {
    const fixture = TestBed.createComponent(PuzzleThemesComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/puzzles/themes').flush([]);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    fixture.nativeElement.querySelector('.puzzle-themes-random-btn').click();

    expect(navigateSpy).toHaveBeenCalledWith(['/puzzles']);
  });
});
