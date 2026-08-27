import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthCardComponent } from './auth-card.component';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [AuthCardComponent],
  template: `
    <app-auth-card title="Sign in" subtitle="Welcome back">
      <p>content</p>
    </app-auth-card>
  `,
})
class HostComponent {}

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [AuthCardComponent],
  template: `
    <app-auth-card>
      <p>content</p>
    </app-auth-card>
  `,
})
class BareHostComponent {}

describe('AuthCardComponent', () => {
  it('renders title, subtitle, and projected content', () => {
    const fixture = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(
      HostComponent,
    );
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('h1')?.textContent).toBe('Sign in');
    expect(el.querySelector('.subtitle')?.textContent).toBe('Welcome back');
    expect(el.textContent).toContain('content');
  });

  it('omits the heading and subtitle when not provided', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [BareHostComponent],
    }).createComponent(BareHostComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('h1')).toBeNull();
    expect(el.querySelector('.subtitle')).toBeNull();
  });
});
