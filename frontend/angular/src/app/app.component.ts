import { Component, ChangeDetectionStrategy, effect, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { HomeHeaderComponent } from './shared/home-header.component';
import { GameHeaderComponent } from './shared/game-header.component';
import { SnowPreferenceService } from './core/snow-preference.service';
import { snow } from './lib/snow';

const SNOW_CYCLE_MS = 15 * 1000;

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterOutlet, HomeHeaderComponent, GameHeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly snowPreference = inject(SnowPreferenceService);

  constructor() {
    effect((onCleanup) => {
      if (!this.snowPreference.enabled()) return;

      let stopCurrent = snow();
      const interval = setInterval(() => {
        stopCurrent = snow();
      }, SNOW_CYCLE_MS);

      onCleanup(() => {
        clearInterval(interval);
        stopCurrent?.();
      });
    });
  }

  // Mirrors react/src/App.tsx's AppHeader(): training/puzzle routes get the
  // minimal GameHeader, everything else gets the full HomeHeader.
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  isGameRoute(): boolean {
    const url = this.url();
    return url.startsWith('/training/') || url.startsWith('/puzzle/');
  }
}
