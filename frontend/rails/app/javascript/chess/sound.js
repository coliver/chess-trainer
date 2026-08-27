import { isCastleMove, isCaptureMove, isPromotionMove } from "@knight-school/chess-core"

// Ported subset of react/src/utils/sound.ts — only the triggers Training
// actually needs. Assets copied to public/rails/sounds at container boot
// (see rails/Dockerfile), served behind nginx's /rails/ mount.
const soundFiles = {
  achievement: "/rails/sounds/achievement.mp3",
  capture: "/rails/sounds/capture.mp3",
  castle: "/rails/sounds/castle.mp3",
  correct: "/rails/sounds/correct.mp3",
  gameStart: "/rails/sounds/game-start.mp3",
  illegal: "/rails/sounds/illegal.mp3",
  incorrect: "/rails/sounds/incorrect.mp3",
  move: "/rails/sounds/move-check.mp3",
  moveOpponent: "/rails/sounds/move-opponent-check.mp3",
  promote: "/rails/sounds/promote.mp3",
  puzzleCorrect: "/rails/sounds/puzzle-correct-2.mp3",
  puzzleWrong: "/rails/sounds/puzzle-wrong.mp3",
}

const cache = {}

let enabled = true

export function setSoundsEnabled(value) {
  enabled = value
}

export function getSoundsEnabled() {
  return enabled
}

function getAudio(name) {
  if (!cache[name]) cache[name] = new Audio(soundFiles[name])
  return cache[name]
}

export function playSound(name) {
  if (!enabled) return

  const audio = getAudio(name)
  if (!audio) return
  audio.currentTime = 0
  audio.play()?.catch((err) => {
    console.warn(`[sound] failed to play "${name}":`, err)
  })
}

export function getMoveSound(fenBefore, uci) {
  if (isCastleMove(uci)) return "castle"
  if (isPromotionMove(uci)) return "promote"
  if (isCaptureMove(fenBefore, uci)) return "capture"
  return "move"
}
