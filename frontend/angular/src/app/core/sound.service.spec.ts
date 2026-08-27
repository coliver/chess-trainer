import { TestBed } from '@angular/core/testing';
import { SoundService } from './sound.service';

describe('SoundService', () => {
  let service: SoundService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SoundService);
  });

  afterEach(() => localStorage.clear());

  it('defaults to enabled', () => {
    expect(service.isEnabled()).toBe(true);
  });

  it('persists the enabled flag to localStorage', () => {
    service.setEnabled(false);
    expect(service.isEnabled()).toBe(false);
    expect(localStorage.getItem('chess-trainer:soundsEnabled')).toBe('false');
  });

  it('does not throw when playing while disabled', () => {
    service.setEnabled(false);
    expect(() => service.play('correct')).not.toThrow();
  });

  it('does not throw when playing while enabled', () => {
    expect(() => service.play('click')).not.toThrow();
  });

  it('classifies castle, promotion, capture, and quiet moves', () => {
    // White short castle from the standard opening castling position.
    const castleFen = 'rnbqk2r/ppppbppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    expect(service.getMoveSound(castleFen, 'e1g1')).toBe('castle');

    const promoFen = '8/P7/8/8/8/8/8/k6K w - - 0 1';
    expect(service.getMoveSound(promoFen, 'a7a8q')).toBe('promote');

    // isCaptureMove only checks whether the destination square is occupied,
    // not full legality, so a same-file "capture" is enough to exercise it.
    const captureFen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    expect(service.getMoveSound(captureFen, 'e4e5')).toBe('capture');

    expect(service.getMoveSound(captureFen, 'g1f3')).toBe('move');
  });
});
