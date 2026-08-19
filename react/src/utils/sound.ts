import { isCastleMove, isCaptureMove, isPromotionMove } from "@knight-school/chess-core";

export type SoundName =
  | "achievement"
  | "boom"
  | "capture"
  | "castle"
  | "click"
  | "correct"
  | "decline"
  | "eventEnd"
  | "eventStart"
  | "eventWarning"
  | "gameDraw"
  | "gameEnd"
  | "gameLose"
  | "gameLoseLong"
  | "gameStart"
  | "gameWin"
  | "illegal"
  | "incorrect"
  | "lessonFail"
  | "move"
  | "moveOpponent"
  | "moveSelf"
  | "notification"
  | "notify"
  | "promote"
  | "puzzleCorrect"
  | "puzzleWrong"
  | "scale"
  | "shoutout"
  | "tense";

const soundFiles: Record<SoundName, string> = {
  achievement: "/sounds/achievement.mp3",
  boom: "/sounds/boom.mp3",
  capture: "/sounds/capture.mp3",
  castle: "/sounds/castle.mp3",
  click: "/sounds/click.mp3",
  correct: "/sounds/correct.mp3",
  decline: "/sounds/decline.mp3",
  eventEnd: "/sounds/event-end.mp3",
  eventStart: "/sounds/event-start.mp3",
  eventWarning: "/sounds/event-warning.mp3",
  gameDraw: "/sounds/game-draw.mp3",
  gameEnd: "/sounds/game-end.mp3",
  gameLose: "/sounds/game-lose.mp3",
  gameLoseLong: "/sounds/game-lose-long.mp3",
  gameStart: "/sounds/game-start.mp3",
  gameWin: "/sounds/game-win-long.mp3",
  illegal: "/sounds/illegal.mp3",
  incorrect: "/sounds/incorrect.mp3",
  lessonFail: "/sounds/lesson-fail.mp3",
  move: "/sounds/move-check.mp3",
  moveOpponent: "/sounds/move-opponent-check.mp3",
  moveSelf: "/sounds/move-self-check.mp3",
  notification: "/sounds/notification.mp3",
  notify: "/sounds/notify.mp3",
  promote: "/sounds/promote.mp3",
  puzzleCorrect: "/sounds/puzzle-correct-2.mp3",
  puzzleWrong: "/sounds/puzzle-wrong.mp3",
  scale: "/sounds/scatter.mp3",
  shoutout: "/sounds/shoutout.mp3",
  tense: "/sounds/tenseconds.mp3",
};

const cache: Partial<Record<SoundName, HTMLAudioElement>> = {};
let enabled = true;

export function setSoundsEnabled(value: boolean) {
  enabled = value;
}

function getAudio(name: SoundName) {
  if (!cache[name]) {
    cache[name] = new Audio(soundFiles[name]);
  }
  return cache[name]!;
}

export function playSound(name: SoundName) {
  if (!enabled) return;

  const audio = getAudio(name);
  audio.currentTime = 0;

  const result = audio.play();
  result?.catch?.(() => {});
}

export type MoveSound = "move" | "capture" | "castle" | "promote" | "illegal";

export function getMoveSound(fenBefore: string, uci: string): MoveSound {
  if (isCastleMove(uci)) return "castle";
  if (isPromotionMove(uci)) return "promote";
  if (isCaptureMove(fenBefore, uci)) return "capture";
  return "move";
}
