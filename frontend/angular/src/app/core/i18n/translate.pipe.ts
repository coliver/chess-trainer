import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from './translate.service';

// Impure so it re-evaluates when the active language changes, not just when
// `key`/`params` change (mirrors ngx-translate's TranslatePipe).
@Pipe({ name: 'translate', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.translate.t(key, params);
  }
}
