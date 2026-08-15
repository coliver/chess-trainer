import { TestBed } from '@angular/core/testing';
import { VariationListComponent } from './variation-list.component';
import type { Opening } from '../../core/openings.service';

function opening(overrides: Partial<Opening>): Opening {
  return {
    eco: 'B90',
    name: 'Sicilian Defense',
    epd: '',
    pgn: '',
    uci_moves: '',
    description: '',
    ...overrides,
  };
}

describe('VariationListComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VariationListComponent],
    }).compileComponents();
  });

  function create(rows: Opening[]) {
    const fixture = TestBed.createComponent(VariationListComponent);
    fixture.componentInstance.rows = rows;
    fixture.detectChanges();
    return fixture;
  }

  it('renders a single-row group as a plain row', () => {
    const fixture = create([opening({ name: 'Sicilian Defense' })]);
    const el: HTMLElement = fixture.nativeElement;
    const rows = el.querySelectorAll('.variation-row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Main line');
  });

  it('collapses a shared sub-variation into a group header', () => {
    const fixture = create([
      opening({ name: 'Sicilian Defense' }),
      opening({ name: 'Sicilian Defense: Najdorf Variation, 6.Be3' }),
      opening({ name: 'Sicilian Defense: Najdorf Variation, 6.Bg5' }),
    ]);
    const el: HTMLElement = fixture.nativeElement;
    const headers = el.querySelectorAll('.variation-group-header');
    expect(headers.length).toBe(1);
    expect(headers[0].textContent).toContain('Najdorf Variation');
    expect(headers[0].textContent).toContain('2');
  });

  it('toggles a group open and closed', () => {
    const fixture = create([
      opening({ name: 'Sicilian Defense: Najdorf Variation, 6.Be3' }),
      opening({ name: 'Sicilian Defense: Najdorf Variation, 6.Bg5' }),
    ]);
    const cmp = fixture.componentInstance;
    const group = cmp.groups[0];
    expect(cmp.isOpen(group)).toBe(false);

    cmp.toggle(group.label);
    expect(cmp.isOpen(group)).toBe(true);

    cmp.toggle(group.label);
    expect(cmp.isOpen(group)).toBe(false);
  });

  it('treats a group containing the selected row as open', () => {
    const rows = [
      opening({ name: 'Sicilian Defense: Najdorf Variation, 6.Be3' }),
      opening({ name: 'Sicilian Defense: Najdorf Variation, 6.Bg5' }),
    ];
    const fixture = create(rows);
    fixture.componentInstance.selectedKey = rows[1].eco + rows[1].name;
    fixture.detectChanges();

    const group = fixture.componentInstance.groups[0];
    expect(fixture.componentInstance.isOpen(group)).toBe(true);
  });

  it('emits pick when a row is clicked', () => {
    const rows = [opening({ name: 'Sicilian Defense' })];
    const fixture = create(rows);
    const picks: Opening[] = [];
    fixture.componentInstance.pick.subscribe((o) => picks.push(o));

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.variation-row');
    button.click();

    expect(picks).toEqual([rows[0]]);
  });
});
