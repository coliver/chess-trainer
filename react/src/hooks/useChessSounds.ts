import { useEffect, useRef } from "react";

type SoundType =
  | "move"
  | "capture"
  | "setup"
  | "castle"
  | "game_complete_win"
  | "promote";

const SOUND_PATHS: Record<SoundType, string> = {
  move: "/sounds/piecemove.wav",
  capture: "/sounds/capture.mp3",
  setup: "/sounds/boardsetup.mp3",
  castle: "/sounds/castle.mp3",
  game_complete_win: "/sounds/game_complete_win.mp3",
  promote: "/sounds/promote.mp3",
};

export function useChessSounds() {
  const audioRefs = useRef<Partial<Record<SoundType, HTMLAudioElement>>>({});

  useEffect(() => {
    (Object.keys(SOUND_PATHS) as SoundType[]).forEach((type) => {
      const audio = new Audio(SOUND_PATHS[type]);
      audio.preload = "auto";
      audio.load();
      audioRefs.current[type] = audio;
    });
  }, []);

  const playSound = (type: SoundType) => {
    const audio = audioRefs.current[type];
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  };

  return { playSound };
}
