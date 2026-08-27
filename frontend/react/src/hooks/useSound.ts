import { useCallback } from "react";
import { playSound, setSoundsEnabled, getSoundsEnabled, type SoundName } from "../utils/sound";

export function useSound() {
  const play = useCallback((name: SoundName) => {
    playSound(name);
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    setSoundsEnabled(value);
  }, []);

  return { play, setEnabled, isEnabled: getSoundsEnabled };
}
