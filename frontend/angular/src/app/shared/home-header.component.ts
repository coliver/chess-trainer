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
}
