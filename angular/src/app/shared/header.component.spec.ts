import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { HeaderComponent } from './header.component';
import { AuthService } from '../core/auth.service';

describe('HeaderComponent', () => {
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('shows a plain greeting when logged out', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.greeting).not.toContain(',');
  });

  it('includes the username in the greeting when logged in', () => {
    localStorage.setItem('token', 'AT');
    localStorage.setItem('username', 'bob');
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.greeting).toContain(', bob');
  });

  it('shows the login/register links and hides nav links when logged out', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('a[aria-label="Login"]')).toBeTruthy();
    expect(el.querySelector('a[aria-label="Register"]')).toBeTruthy();
    expect(el.querySelector('button[aria-label="Logout"]')).toBeNull();
  });

  it('shows nav links and a logout button when logged in', () => {
    localStorage.setItem('token', 'AT');
    localStorage.setItem('username', 'bob');
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('a[aria-label="Login"]')).toBeNull();
    expect(el.querySelector('button[aria-label="Logout"]')).toBeTruthy();
  });

  it('logs out and navigates to /login on logout', () => {
    localStorage.setItem('token', 'AT');
    localStorage.setItem('username', 'bob');
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();

    const navigateSpy = spyOn(router, 'navigate');
    const auth = TestBed.inject(AuthService);

    fixture.componentInstance.onLogout();

    expect(auth.isLoggedIn).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
