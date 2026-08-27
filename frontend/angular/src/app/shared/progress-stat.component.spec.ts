import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProgressStatComponent } from './progress-stat.component';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ProgressStatComponent],
  template: `
    <app-progress-stat icon="🎯" label="Accuracy">42%</app-progress-stat>
    <app-progress-stat icon="🏆" label="Mastered" variant="mastery">
      3
      <div stat-extra data-testid="bar"></div>
    </app-progress-stat>
  `,
})
class HostComponent {}

describe('ProgressStatComponent', () => {
  it('renders icon, value, and label', () => {
    const fixture = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(
      HostComponent,
    );
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.textContent).toContain('🎯');
    expect(el.textContent).toContain('42%');
    expect(el.textContent).toContain('Accuracy');
  });

  it('applies the mastery variant class and projects extra content', () => {
    const fixture = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(
      HostComponent,
    );
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    const stats = el.querySelectorAll('.progress-stat');
    expect(stats[1].classList).toContain('progress-stat--mastery');
    expect(stats[1].querySelector('[data-testid="bar"]')).toBeTruthy();
  });
});
