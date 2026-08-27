// react/src/context/GameHeaderContext.tsx
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface GameHeaderContextType {
  status: string;
  setStatus: (status: string) => void;
  onSettingsClick?: () => void;
  setOnSettingsClick: (handler?: () => void) => void;
}

const GameHeaderContext = createContext<GameHeaderContextType>({
  status: "",
  setStatus: () => {},
  setOnSettingsClick: () => {},
});

export function GameHeaderProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState("");
  const [onSettingsClick, setOnSettingsClick] = useState<(() => void) | undefined>();

  return (
    <GameHeaderContext.Provider
      value={{
        status,
        setStatus,
        onSettingsClick,
        setOnSettingsClick,
      }}
    >
      {children}
    </GameHeaderContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context + hook colocation is the standard pattern
export function useGameHeader() {
  return useContext(GameHeaderContext);
}
