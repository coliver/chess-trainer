import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { TranslateService } from './core/i18n/translate.service';
import { stubTranslate } from './core/i18n/testing';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([{ path: 'training/:id', children: [] }]),
        provideLocationMocks(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    stubTranslate(TestBed.inject(TranslateService), {
      'header.title': 'Knight School',
      'header.nav': 'Primary',
    });
    localStorage.clear();
  });

  it('creates the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the HomeHeader brand on non-game routes', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.home-header-title-text')?.textContent).toContain('Knight');
    expect(el.querySelector('.game-header')).toBeNull();
  });

  it('switches to the minimal GameHeader on a training route', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/training/1');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.game-header')).toBeTruthy();
    expect(el.querySelector('.home-header')).toBeNull();
  });
});
