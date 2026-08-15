import { useCallback, useState } from "react";

export type BoardOrientation = "white" | "black";

/** Board orientation state with a flip toggle, for use with <Board> + <FlipBoardButton>. */
export function useBoardOrientation(initial: BoardOrientation = "white") {
  const [orientation, setOrientation] = useState<BoardOrientation>(initial);
  const flip = useCallback(
    () => setOrientation((o) => (o === "white" ? "black" : "white")),
    [],
  );
  return { orientation, flip };
}
