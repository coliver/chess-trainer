import { TestBed } from '@angular/core/testing';
import { OpeningCardComponent } from './opening-card.component';
import type { OpeningGroup } from '../../lib/group-openings';
import type { Opening } from '../../core/openings.service';

function group(overrides: Partial<OpeningGroup> = {}): OpeningGroup {
  const rep: Opening = {
    eco: 'B90',
    name: 'Sicilian Defense',
    epd: '',
    pgn: '',
    uci_moves: 'e2e4 c7c5',
    description: '',
  };
  return {
    base: 'Sicilian Defense',
    representative: rep,
    eco: 'B90',
    members: [rep],
    count: 12,
    ...overrides,
  };
}

describe('OpeningCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpeningCardComponent],
    }).compileComponents();
  });

  it('renders the base name, variation count, and eco chip', () => {
    const fixture = TestBed.createComponent(OpeningCardComponent);
    fixture.componentInstance.group = group();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.oc-name')?.textContent).toContain('Sicilian Defense');
    expect(el.querySelector('.oc-count')?.textContent).toContain('12 variations');
    expect(el.querySelector('.eco-chip')?.textContent).toContain('B90');
  });

  it('singularizes the variation count label', () => {
    const fixture = TestBed.createComponent(OpeningCardComponent);
    fixture.componentInstance.group = group({ count: 1 });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.oc-count')?.textContent).toContain('1 variation');
    expect(el.querySelector('.oc-count')?.textContent).not.toContain('1 variations');
  });

  it('emits cardSelect when clicked', () => {
    const fixture = TestBed.createComponent(OpeningCardComponent);
    fixture.componentInstance.group = group();
    fixture.detectChanges();

    let emitted = 0;
    fixture.componentInstance.cardSelect.subscribe(() => emitted++);
    fixture.nativeElement.querySelector('button').click();

    expect(emitted).toBe(1);
  });

  it('reflects the selected state via aria-pressed', () => {
    const fixture = TestBed.createComponent(OpeningCardComponent);
    fixture.componentInstance.group = group();
    fixture.componentInstance.selected = true;
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('disconnects the intersection observer on destroy without error', () => {
    const fixture = TestBed.createComponent(OpeningCardComponent);
    fixture.componentInstance.group = group();
    fixture.detectChanges();

    expect(() => fixture.componentInstance.ngOnDestroy()).not.toThrow();
  });
});
