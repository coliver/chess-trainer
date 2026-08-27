import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GameHeaderComponent } from './game-header.component';
import { GameStatusService } from '../core/game-status.service';
import { TranslateService } from '../core/i18n/translate.service';
import { stubTranslate } from '../core/i18n/testing';

describe('GameHeaderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameHeaderComponent],
      providers: [
        provideRouter([{ path: 'dashboard', children: [] }, { path: 'settings', children: [] }]),
        provideLocationMocks(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    stubTranslate(TestBed.inject(TranslateService), { 'header.settings': 'Settings' });
  });

  it('renders the current status text', () => {
    TestBed.inject(GameStatusService).status.set('White to move');
    const fixture = TestBed.createComponent(GameHeaderComponent);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.game-header-status')?.textContent).toContain('White to move');
  });

  it('navigates to /dashboard on back', () => {
    const fixture = TestBed.createComponent(GameHeaderComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    fixture.nativeElement.querySelector('.game-header-back').click();

    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });

  it('navigates to /settings when no onSettingsClick override is set', () => {
    const fixture = TestBed.createComponent(GameHeaderComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    fixture.nativeElement.querySelector('.game-header-settings').click();

    expect(navigateSpy).toHaveBeenCalledWith(['/settings'], jasmine.any(Object));
  });

  it('calls the onSettingsClick override instead of navigating when set', () => {
    const override = jasmine.createSpy('override');
    TestBed.inject(GameStatusService).onSettingsClick.set(override);
    const fixture = TestBed.createComponent(GameHeaderComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    fixture.nativeElement.querySelector('.game-header-settings').click();

    expect(override).toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
