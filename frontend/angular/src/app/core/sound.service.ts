import { Injectable } from '@angular/core';
import { isCastleMove, isCaptureMove, isPromotionMove } from '@knight-school/chess-core';

export type SoundName =
  | 'achievement'
  | 'boom'
  | 'capture'
  | 'castle'
  | 'click'
  | 'correct'
  | 'decline'
  | 'eventEnd'
  | 'eventStart'
  | 'eventWarning'
  | 'gameDraw'
  | 'gameEnd'
  | 'gameLose'
  | 'gameLoseLong'
  | 'gameStart'
  | 'gameWin'
  | 'illegal'
  | 'incorrect'
  | 'lessonFail'
  | 'move'
  | 'moveOpponent'
  | 'moveSelf'
  | 'notification'
  | 'notify'
  | 'promote'
  | 'puzzleCorrect'
  | 'puzzleWrong'
  | 'scale'
  | 'shoutout'
  | 'tense';

// Root-absolute so it resolves the same way regardless of the current route
// (matches TranslateService's /angular/i18n/ convention). Synced from
// packages/shared-assets/sounds by scripts/sync-shared-assets.mjs.
const soundFiles: Record<SoundName, string> = {
  achievement: '/angular/sounds/achievement.mp3',
  boom: '/angular/sounds/boom.mp3',
  capture: '/angular/sounds/capture.mp3',
  castle: '/angular/sounds/castle.mp3',
  click: '/angular/sounds/click.mp3',
  correct: '/angular/sounds/correct.mp3',
  decline: '/angular/sounds/decline.mp3',
  eventEnd: '/angular/sounds/event-end.mp3',
  eventStart: '/angular/sounds/event-start.mp3',
  eventWarning: '/angular/sounds/event-warning.mp3',
  gameDraw: '/angular/sounds/game-draw.mp3',
  gameEnd: '/angular/sounds/game-end.mp3',
  gameLose: '/angular/sounds/game-lose.mp3',
  gameLoseLong: '/angular/sounds/game-lose-long.mp3',
  gameStart: '/angular/sounds/game-start.mp3',
  gameWin: '/angular/sounds/game-win-long.mp3',
  illegal: '/angular/sounds/illegal.mp3',
  incorrect: '/angular/sounds/incorrect.mp3',
  lessonFail: '/angular/sounds/lesson-fail.mp3',
  move: '/angular/sounds/move-check.mp3',
  moveOpponent: '/angular/sounds/move-opponent-check.mp3',
  moveSelf: '/angular/sounds/move-self-check.mp3',
  notification: '/angular/sounds/notification.mp3',
  notify: '/angular/sounds/notify.mp3',
  promote: '/angular/sounds/promote.mp3',
  puzzleCorrect: '/angular/sounds/puzzle-correct-2.mp3',
  puzzleWrong: '/angular/sounds/puzzle-wrong.mp3',
  scale: '/angular/sounds/scatter.mp3',
  shoutout: '/angular/sounds/shoutout.mp3',
  tense: '/angular/sounds/tenseconds.mp3',
};

const STORAGE_KEY = 'chess-trainer:soundsEnabled';

export type MoveSound = 'move' | 'capture' | 'castle' | 'promote' | 'illegal';

/** Angular counterpart of react/src/utils/sound.ts + hooks/useSound.ts. */
@Injectable({ providedIn: 'root' })
export class SoundService {
  private readonly cache = new Map<SoundName, HTMLAudioElement>();
  private enabled = this.readStoredEnabled();

  private readStoredEnabled(): boolean {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    localStorage.setItem(STORAGE_KEY, String(value));
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  play(name: SoundName): void {
    if (!this.enabled) return;

    const audio = this.getAudio(name);
    audio.currentTime = 0;

    audio.play()?.catch((err: unknown) => {
      console.warn(`[sound] failed to play "${name}":`, err);
    });
  }

  getMoveSound(fenBefore: string, uci: string): MoveSound {
    if (isCastleMove(uci)) return 'castle';
    if (isPromotionMove(uci)) return 'promote';
    if (isCaptureMove(fenBefore, uci)) return 'capture';
    return 'move';
  }

  private getAudio(name: SoundName): HTMLAudioElement {
    let audio = this.cache.get(name);
    if (!audio) {
      audio = new Audio(soundFiles[name]);
      this.cache.set(name, audio);
    }
    return audio;
  }
}
