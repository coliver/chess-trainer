import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OverflowMenuComponent } from './overflow-menu.component';
import { AuthService } from '../core/auth.service';
import { TranslateService } from '../core/i18n/translate.service';
import { stubTranslate } from '../core/i18n/testing';

describe('OverflowMenuComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverflowMenuComponent],
      providers: [
        provideRouter([{ path: 'login', children: [] }, { path: 'settings', children: [] }]),
        provideLocationMocks(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    stubTranslate(TestBed.inject(TranslateService), {
      'header.nav': 'Primary',
      'header.settings': 'Settings',
      'header.logout': 'Logout',
      'header.viewSource': 'View source on GitHub',
      'language.toggle': 'Language',
      'theme.toggle': 'Toggle theme',
    });
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('renders nothing when closed', () => {
    const fixture = TestBed.createComponent(OverflowMenuComponent);
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.overflow-menu')).toBeNull();
  });

  it('hides settings/logout when logged out, shows them when logged in', () => {
    const fixture = TestBed.createComponent(OverflowMenuComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    let el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.overflow-menu-item').length).toBe(1); // just "view source"

    localStorage.setItem('token', 'AT');
    fixture.detectChanges();

    el = fixture.nativeElement;
    expect(el.textContent).toContain('Settings');
    expect(el.textContent).toContain('Logout');
  });

  it('emits close and navigates to /login on logout', () => {
    localStorage.setItem('token', 'AT');
    const fixture = TestBed.createComponent(OverflowMenuComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    const closeSpy = jasmine.createSpy('close');
    fixture.componentInstance.closed.subscribe(closeSpy);

    const el: HTMLElement = fixture.nativeElement;
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('.overflow-menu-item'));
    const logoutButton = buttons.find((b) => b.textContent?.includes('Logout'));
    logoutButton?.click();

    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    expect(closeSpy).toHaveBeenCalled();
    expect(TestBed.inject(AuthService).isLoggedIn).toBe(false);
  });

  it('closes on Escape', () => {
    const fixture = TestBed.createComponent(OverflowMenuComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const closeSpy = jasmine.createSpy('close');
    fixture.componentInstance.closed.subscribe(closeSpy);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closeSpy).toHaveBeenCalled();
  });
});
