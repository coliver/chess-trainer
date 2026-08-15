import type { Opening } from '../core/openings.service';
import { describeOpening } from './opening-text';

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

describe('describeOpening', () => {
  it('prefers the DB description when present', () => {
    const o = opening({ description: '  A custom blurb.  ' });
    expect(describeOpening(o)).toBe('A custom blurb.');
  });

  it('uses the authored base text for a known main line', () => {
    const o = opening({ name: 'Sicilian Defense', description: '' });
    expect(describeOpening(o)).toContain("Black's most popular");
  });

  it('falls back to a factual blurb for an unknown main line', () => {
    const o = opening({ name: 'Totally Made Up Opening', eco: 'Z99', description: '' });
    expect(describeOpening(o)).toBe('Totally Made Up Opening (Z99) — a recognised chess opening.');
  });

  it('prefixes a known base blurb for a variation', () => {
    const o = opening({ name: 'Sicilian Defense: Najdorf Variation', description: '' });
    const text = describeOpening(o);
    expect(text.startsWith('Najdorf Variation — a variation of the Sicilian Defense.')).toBe(true);
    expect(text).toContain("Black's most popular");
  });

  it('falls back to a bare variation label when the base is unknown', () => {
    const o = opening({ name: 'Totally Made Up Opening: Some Line', description: '' });
    expect(describeOpening(o)).toBe('Some Line — a variation of the Totally Made Up Opening.');
  });
});
