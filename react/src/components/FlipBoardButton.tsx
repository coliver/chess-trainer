import { useRef, useState } from "react";
import { Button } from "./Button";

type FlipBoardButtonProps = {
  onClick?: () => void;
};

export function FlipBoardButton({ onClick }: FlipBoardButtonProps) {
  // Accumulate rotation (rather than toggling 0/180) so repeated clicks keep
  // spinning forward instead of snapping back.
  const turns = useRef(0);
  const [rotation, setRotation] = useState(0);

  const handleClick = () => {
    turns.current += 1;
    setRotation(turns.current * 180);
    onClick?.();
  };

  return (
    <Button type="button" variant="secondary" onClick={handleClick}>
      <span
        className="flip-icon"
        style={{ transform: `rotate(${rotation}deg)` }}
        aria-hidden="true"
      >
        ⇅
      </span>{" "}
      Flip board
    </Button>
  );
}
