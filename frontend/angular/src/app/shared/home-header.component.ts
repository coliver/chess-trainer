import { Component, ChangeDetectionStrategy, ElementRef, ViewChild, inject } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { KnightSchoolIconComponent } from './knight-school-icon.component';
import { OverflowMenuComponent } from './overflow-menu.component';

/**
 * Angular counterpart of react/src/components/HomeHeader.tsx — hamburger
 * menu + brand + Openings/Puzzles tab nav, shown on every route except
 * training/puzzle screens (see GameHeaderComponent / AppComponent).
 */
@Component({
  selector: 'app-home-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterLink, TranslatePipe, KnightSchoolIconComponent, OverflowMenuComponent],
  template: `
    <header class="home-header">
      <div class="home-header-inner">
        <div class="home-header-top">
          <div class="home-header-brand-group">
            <button
              #menuButton
              class="home-header-menu-button"
              type="button"
              (click)="menuOpen = !menuOpen"
              aria-label="Menu"
              [attr.aria-expanded]="menuOpen"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
            <div class="home-header-branding">
              <app-knight-school-icon height="24px" className="home-header-icon" />
              <span class="home-header-title-text">{{ 'header.title' | translate }}</span>
            </div>
          </div>

          @if (auth.isLoggedIn && (isOpeningsActive() || isPuzzlesActive())) {
            <nav class="home-header-tabs">
              <a
                routerLink="/dashboard"
                class="home-header-tab"
                [class.active]="isOpeningsActive()"
              >
                {{ 'header.openings' | translate }}
              </a>
              <a
                routerLink="/puzzles/themes"
                class="home-header-tab"
                [class.active]="isPuzzlesActive()"
              >
                {{ 'header.puzzles' | translate }}
              </a>
            </nav>
          }

          <app-overflow-menu
            [open]="menuOpen"
            [triggerElement]="menuButton"
            (closed)="menuOpen = false"
          />
        </div>
      </div>
    </header>
    @if (auth.isLoggedIn) {
      <nav class="bottom-tabbar" aria-label="{{ 'header.bottomNav' | translate }}">
        <a routerLink="/dashboard" class="bottom-tab" [class.active]="isOpeningsActive()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" /><path d="M5 21h14" /></svg>
          <span>{{ 'header.openings' | translate }}</span>
        </a>
        <a routerLink="/puzzles/themes" class="bottom-tab" [class.active]="isPuzzlesActive()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19.439 7.85c-.049.322.059.648.288.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-3.408 0l-1.568-1.568a1.026 1.026 0 0 0-.877-.288c-.47.07-.802.48-.968.925a2.5 2.5 0 1 1-3.214-3.214c.446-.166.855-.497.925-.968a1.026 1.026 0 0 0-.288-.877l-1.568-1.568a2.404 2.404 0 0 1 0-3.408l1.611-1.611a.98.98 0 0 1 .837-.276c.47.07.802.48.968.925a2.5 2.5 0 1 0 3.214-3.214c-.446-.166-.855-.497-.925-.968a.979.979 0 0 1 .276-.837l1.61-1.61a2.404 2.404 0 0 1 3.408 0l1.568 1.568c.23.23.556.338.877.288.47-.07.802-.48.968-.925a2.5 2.5 0 1 1 3.214 3.214c-.446.166-.855.497-.925.968z" /></svg>
          <span>{{ 'header.puzzles' | translate }}</span>
        </a>
        <a routerLink="/settings" class="bottom-tab" [class.active]="isSettingsActive()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
          <span>{{ 'header.settings' | translate }}</span>
        </a>
      </nav>
    }
  `,
})
export class HomeHeaderComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  @ViewChild('menuButton') private readonly menuButtonRef?: ElementRef<HTMLButtonElement>;

  menuOpen = false;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  get menuButton(): HTMLElement | null {
    return this.menuButtonRef?.nativeElement ?? null;
  }

  isOpeningsActive(): boolean {
    return this.url().startsWith('/dashboard');
  }

  isPuzzlesActive(): boolean {
    return this.url().startsWith('/puzzles');
  }

  isSettingsActive(): boolean {
    return this.url().startsWith('/settings');
  }
}
