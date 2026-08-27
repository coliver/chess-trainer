import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HomeHeaderComponent } from './home-header.component';
import { TranslateService } from '../core/i18n/translate.service';
import { stubTranslate } from '../core/i18n/testing';

describe('HomeHeaderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeHeaderComponent],
      providers: [
        provideRouter([
          { path: 'dashboard', children: [] },
          { path: 'puzzles/themes', children: [] },
        ]),
        provideLocationMocks(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    stubTranslate(TestBed.inject(TranslateService), {
      'header.title': 'Knight School',
      'header.openings': 'Openings',
      'header.puzzles': 'Puzzles',
      'header.nav': 'Primary',
    });
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('renders the brand', () => {
    const fixture = TestBed.createComponent(HomeHeaderComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.home-header-title-text').textContent).toContain(
      'Knight School',
    );
  });

  it('hides the tab nav when logged out', () => {
    const fixture = TestBed.createComponent(HomeHeaderComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.home-header-tabs')).toBeNull();
  });

  it('shows the tab nav on /dashboard when logged in, marking Openings active', async () => {
    localStorage.setItem('token', 'AT');
    const fixture = TestBed.createComponent(HomeHeaderComponent);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const tabs = el.querySelectorAll('.home-header-tab');
    expect(tabs.length).toBe(2);
    expect(tabs[0].classList.contains('active')).toBe(true);
    expect(tabs[1].classList.contains('active')).toBe(false);
  });

  it('opens the overflow menu on hamburger click', () => {
    const fixture = TestBed.createComponent(HomeHeaderComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.overflow-menu')).toBeNull();
    el.querySelector<HTMLButtonElement>('.home-header-menu-button')?.click();
    fixture.detectChanges();

    expect(el.querySelector('.overflow-menu')).toBeTruthy();
  });
});
