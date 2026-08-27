import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PreferencesService } from './preferences.service';

describe('PreferencesService', () => {
  let service: PreferencesService;
  let httpMock: HttpTestingController;

  const preferences = {
    language: 'en-US',
    theme: 'system' as const,
    board_theme: 'default',
    piece_set: 'standard',
    show_coordinates: true,
    board_animations: true,
    board_orientation_mode: 'auto' as const,
    sound: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PreferencesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs the current preferences', () => {
    let result: unknown;
    service.get().subscribe((r) => (result = r));

    const req = httpMock.expectOne('/api/users/me/preferences');
    expect(req.request.method).toBe('GET');
    req.flush(preferences);

    expect(result).toEqual(preferences);
  });

  it('PATCHes a partial update', () => {
    let result: unknown;
    service.update({ theme: 'dark' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne('/api/users/me/preferences');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ theme: 'dark' });
    req.flush({ ...preferences, theme: 'dark' });

    expect(result).toEqual({ ...preferences, theme: 'dark' });
  });
});
