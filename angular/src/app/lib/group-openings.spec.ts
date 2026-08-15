import type { Opening } from '../core/openings.service';
import {
  baseNameOf,
  variationLabelOf,
  groupVariations,
  subVariationLabelOf,
  groupByBase,
} from './group-openings';

function opening(overrides: Partial<Opening>): Opening {
  return {
    eco: 'B90',
    name: 'Sicilian Defense',
    epd: 'startpos',
    pgn: '',
    uci_moves: 'e2e4 c7c5',
    description: '',
    ...overrides,
  };
}

describe('baseNameOf', () => {
  it('splits on the first colon', () => {
    expect(baseNameOf('Sicilian Defense: Najdorf Variation')).toBe('Sicilian Defense');
  });

  it('returns the whole name when there is no colon', () => {
    expect(baseNameOf('Sicilian Defense')).toBe('Sicilian Defense');
  });
});

describe('variationLabelOf', () => {
  it('returns "Main line" for the bare root name', () => {
    expect(variationLabelOf('Sicilian Defense')).toBe('Main line');
  });

  it('returns the text after the colon for a variation', () => {
    expect(variationLabelOf('Sicilian Defense: Najdorf Variation')).toBe('Najdorf Variation');
  });
});

describe('subVariationLabelOf', () => {
  it('returns "Main line" when the variation label has no comma', () => {
    expect(subVariationLabelOf('Sicilian Defense: Najdorf Variation')).toBe('Main line');
  });

  it('returns the text after the first comma', () => {
    expect(subVariationLabelOf('Sicilian Defense: Najdorf Variation, 6.Be3')).toBe('6.Be3');
  });

  it('returns "Main line" for the bare root name', () => {
    expect(subVariationLabelOf('Sicilian Defense')).toBe('Main line');
  });
});

describe('groupVariations', () => {
  it('puts "Main line" first regardless of size', () => {
    const rows = [
      opening({ name: 'Sicilian Defense: Najdorf Variation' }),
      opening({ name: 'Sicilian Defense' }),
    ];
    const groups = groupVariations(rows);
    expect(groups[0].label).toBe('Main line');
  });

  it('clusters rows by the first comma-separated segment', () => {
    const rows = [
      opening({ name: 'Sicilian Defense: Najdorf Variation, 6.Be3' }),
      opening({ name: 'Sicilian Defense: Najdorf Variation, 6.Bg5' }),
      opening({ name: 'Sicilian Defense: Dragon Variation' }),
    ];
    const groups = groupVariations(rows);
    const najdorf = groups.find((g) => g.label === 'Najdorf Variation');
    expect(najdorf?.rows.length).toBe(2);
  });

  it('sorts non-main groups by size then alphabetically', () => {
    const rows = [
      opening({ name: 'Sicilian Defense: Dragon Variation' }),
      opening({ name: 'Sicilian Defense: Najdorf Variation, 6.Be3' }),
      opening({ name: 'Sicilian Defense: Najdorf Variation, 6.Bg5' }),
    ];
    const groups = groupVariations(rows);
    expect(groups.map((g) => g.label)).toEqual(['Najdorf Variation', 'Dragon Variation']);
  });
});

describe('groupByBase', () => {
  it('groups rows under their base name', () => {
    const rows = [
      opening({ name: 'Sicilian Defense', eco: 'B20' }),
      opening({ name: 'Sicilian Defense: Najdorf Variation', eco: 'B90' }),
      opening({ name: 'French Defense', eco: 'C00' }),
    ];
    const groups = groupByBase(rows);
    const sicilian = groups.find((g) => g.base === 'Sicilian Defense');
    expect(sicilian?.count).toBe(2);
    expect(sicilian?.eco).toBe('B20');
  });

  it('picks the bare root row as the representative when present', () => {
    const root = opening({ name: 'Sicilian Defense', eco: 'B20' });
    const variation = opening({ name: 'Sicilian Defense: Najdorf Variation', eco: 'B90' });
    const [group] = groupByBase([variation, root]);
    expect(group.representative).toBe(root);
    expect(group.members[0]).toBe(root);
  });

  it('falls back to the shortest line as representative when no bare root exists', () => {
    const long = opening({
      name: 'Sicilian Defense: Najdorf Variation, 6.Be3',
      uci_moves: 'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1e3',
    });
    const short = opening({
      name: 'Sicilian Defense: Najdorf Variation',
      uci_moves: 'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6',
    });
    const [group] = groupByBase([long, short]);
    expect(group.representative).toBe(short);
  });

  it('sorts groups by count descending, then alphabetically', () => {
    const rows = [
      opening({ name: 'French Defense', eco: 'C00' }),
      opening({ name: 'Sicilian Defense', eco: 'B20' }),
      opening({ name: 'Sicilian Defense: Najdorf Variation', eco: 'B90' }),
    ];
    const groups = groupByBase(rows);
    expect(groups.map((g) => g.base)).toEqual(['Sicilian Defense', 'French Defense']);
  });
});
