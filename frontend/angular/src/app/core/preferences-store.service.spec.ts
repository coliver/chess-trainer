import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PreferencesStoreService } from './preferences-store.service';
import { AuthService } from './auth.service';
import { DEFAULT_PREFERENCES } from './preferences';

describe('PreferencesStoreService', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts from local/default preferences when logged out', () => {
    const store = TestBed.inject(PreferencesStoreService);
    expect(store.preferences()).toEqual(DEFAULT_PREFERENCES);
    httpMock.expectNone('/api/users/me/preferences');
  });

  it('hydrates from the backend once logged in', () => {
    const store = TestBed.inject(PreferencesStoreService);
    const auth = TestBed.inject(AuthService);

    auth.loggedIn.set(true);
    TestBed.tick();

    httpMock
      .expectOne('/api/users/me/preferences')
      .flush({ ...DEFAULT_PREFERENCES, theme: 'dark' });

    expect(store.preferences().theme).toBe('dark');
  });

  it('applies an update optimistically and persists it locally', () => {
    const store = TestBed.inject(PreferencesStoreService);
    store.update({ sound: true });

    expect(store.preferences().sound).toBe(true);
    expect(localStorage.getItem('sound')).toBe('true');
    httpMock.expectNone('/api/users/me/preferences');
  });

  it('PATCHes the backend when updating while logged in', () => {
    const store = TestBed.inject(PreferencesStoreService);
    const auth = TestBed.inject(AuthService);
    auth.loggedIn.set(true);
    TestBed.tick();
    httpMock.expectOne('/api/users/me/preferences').flush(DEFAULT_PREFERENCES);

    store.update({ sound: true });

    const req = httpMock.expectOne('/api/users/me/preferences');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ sound: true });
    req.flush({ ...DEFAULT_PREFERENCES, sound: true });
  });

  it('resets to defaults', () => {
    const store = TestBed.inject(PreferencesStoreService);
    store.update({ sound: true, theme: 'dark' });

    store.reset();

    expect(store.preferences()).toEqual(DEFAULT_PREFERENCES);
    expect(localStorage.getItem('theme')).toBe('system');
  });
});
