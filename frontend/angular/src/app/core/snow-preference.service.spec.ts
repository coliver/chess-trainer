import { TestBed } from '@angular/core/testing';
import { SnowPreferenceService } from './snow-preference.service';

describe('SnowPreferenceService', () => {
  afterEach(() => localStorage.clear());

  it('defaults to disabled when nothing is stored', () => {
    localStorage.clear();
    const service = TestBed.configureTestingModule({}).inject(SnowPreferenceService);
    expect(service.enabled()).toBe(false);
  });

  it('reads a previously stored enabled value on construction', () => {
    localStorage.setItem('snow_enabled', 'true');
    const service = TestBed.configureTestingModule({}).inject(SnowPreferenceService);
    expect(service.enabled()).toBe(true);
  });

  it('persists and reflects a change in the enabled signal', () => {
    localStorage.clear();
    const service = TestBed.configureTestingModule({}).inject(SnowPreferenceService);

    service.setEnabled(true);

    expect(service.enabled()).toBe(true);
    expect(localStorage.getItem('snow_enabled')).toBe('true');
  });
});
