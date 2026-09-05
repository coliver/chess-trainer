import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { ThemeToggleComponent } from './theme-toggle.component';
import { LanguageToggleComponent } from './language-toggle.component';

const APP_VERSION = 'dev';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Angular counterpart of react/src/components/OverflowMenu.tsx — the
 * hamburger dropdown opened from HomeHeaderComponent. React renders this via
 * `createPortal(..., document.body)`; this component manually re-parents its
 * `.overflow-menu` backdrop to `document.body` on open for the same reason:
 * `.home-header` has `backdrop-filter`, which establishes a containing block
 * for `position: fixed` descendants in Chromium, so without the portal the
 * "fixed" backdrop resolves against the header's box instead of the
 * viewport and renders as a tiny strip pinned to the header row.
 */
@Component({
  selector: 'app-overflow-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TranslatePipe, ThemeToggleComponent, LanguageToggleComponent],
  template: `
    @if (open) {
      <div class="overflow-menu" #backdrop (mousedown)="onBackdropMouseDown($event)">
        <nav
          class="overflow-menu-items"
          #menu
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="'header.nav' | translate"
        >
          @if (auth.isLoggedIn) {
            <button class="overflow-menu-item" type="button" (click)="handleSettingsClick()">
              {{ 'header.settings' | translate }}
            </button>
            <button class="overflow-menu-item" type="button" (click)="handleLogout()">
              {{ 'header.logout' | translate }}
            </button>
          }
          <a
            class="overflow-menu-item"
            href="https://github.com/coliver/chess-trainer"
            target="_blank"
            rel="noopener noreferrer"
            (click)="closed.emit()"
          >
            {{ 'header.viewSource' | translate }}
          </a>
          <div class="overflow-menu-divider"></div>
          <div class="overflow-menu-control">
            <span class="overflow-menu-label">{{ 'language.toggle' | translate }}</span>
            <app-language-toggle />
          </div>
          <div class="overflow-menu-control">
            <span class="overflow-menu-label">{{ 'theme.toggle' | translate }}</span>
            <app-theme-toggle />
          </div>
          <div class="overflow-menu-divider"></div>
          <div class="overflow-menu-footer">
            <span class="overflow-menu-version">{{ appVersion }}</span>
          </div>
        </nav>
      </div>
    }
  `,
})
export class OverflowMenuComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() triggerElement: HTMLElement | null = null;
  @Output() closed = new EventEmitter<void>();
  @ViewChild('menu') private readonly menuRef?: ElementRef<HTMLElement>;
  @ViewChild('backdrop') private readonly backdropRef?: ElementRef<HTMLElement>;

  // Angular always emits a host element for a component, even with an empty
  // @if template — unlike React's `return null`, which produces no DOM node
  // at all. Left as a normal inline box, that empty (or, once portaled,
  // permanently childless) host would still count as a real flex child in
  // HomeHeaderComponent's `justify-content: space-between` row, throwing off
  // the tabs' alignment. `display: none` removes it from flex layout
  // entirely in both states — the visible backdrop lives in `document.body`
  // once open (see `onOpen`), so the host itself never needs to be visible.
  @HostBinding('style.display') readonly hostDisplay = 'none';

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly appVersion = APP_VERSION;

  private previouslyFocused: HTMLElement | null = null;
  private readonly onKeyDown = (event: KeyboardEvent) => this.handleKeyDown(event);

  ngOnChanges(): void {
    if (this.open) {
      this.onOpen();
    } else {
      this.onCloseCleanup();
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.onKeyDown);
  }

  onBackdropMouseDown(event: MouseEvent): void {
    if (!this.menuRef?.nativeElement.contains(event.target as Node)) {
      this.closed.emit();
    }
  }

  handleLogout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
    this.closed.emit();
  }

  handleSettingsClick(): void {
    this.router.navigate(['/settings'], { state: { from: this.router.url } });
    this.closed.emit();
  }

  private onOpen(): void {
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    document.addEventListener('keydown', this.onKeyDown);
    queueMicrotask(() => {
      // The @if block has just created a fresh backdrop element (Angular
      // tears down and recreates it on every open/close toggle) — move it
      // to document.body before focusing into it, matching React's
      // createPortal target and escaping .home-header's backdrop-filter
      // containing block. Angular removes it from whatever its current
      // parent is when `open` goes false, so no manual cleanup is needed.
      if (this.backdropRef) {
        document.body.appendChild(this.backdropRef.nativeElement);
      }
      this.menuRef?.nativeElement.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
    });
  }

  private onCloseCleanup(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    (this.triggerElement ?? this.previouslyFocused)?.focus();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closed.emit();
      return;
    }

    if (event.key !== 'Tab' || !this.menuRef) return;

    const focusable = Array.from(
      this.menuRef.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
