import { Injectable, signal } from '@angular/core';

/**
 * Angular counterpart of react/src/context/GameHeaderContext.tsx — lets
 * training/puzzle pages push a status line and an optional settings-click
 * override up into GameHeaderComponent. A plain root-provided service
 * stands in for React's context/provider pair.
 */
@Injectable({ providedIn: 'root' })
export class GameStatusService {
  readonly status = signal('');
  readonly onSettingsClick = signal<(() => void) | undefined>(undefined);
}
