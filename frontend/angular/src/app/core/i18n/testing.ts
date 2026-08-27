import { TranslateService } from './translate.service';

/**
 * Stubs `TranslateService.t()` in specs so templates render real strings
 * synchronously instead of the raw key (the real service only resolves keys
 * once its locale JSON has loaded over HTTP, which specs don't trigger).
 * Pass just the keys the spec under test actually reads.
 */
export function stubTranslate(
  translate: TranslateService,
  strings: Record<string, string>,
): jasmine.Spy {
  return spyOn(translate, 't').and.callFake((key: string, params?: Record<string, string | number>) => {
    const template = strings[key];
    if (template === undefined) {
      return key;
    }
    if (!params) {
      return template;
    }
    return template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
      name in params ? String(params[name]) : match,
    );
  });
}
