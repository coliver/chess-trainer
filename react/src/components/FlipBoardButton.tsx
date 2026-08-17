import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./Button";

type FlipBoardButtonProps = {
  onClick?: () => void;
  className?: string;
};

export function FlipBoardButton({ onClick, className }: FlipBoardButtonProps) {
  // Accumulate rotation (rather than toggling 0/180) so repeated clicks keep
  // spinning forward instead of snapping back.
  const { t } = useTranslation();
  const turns = useRef(0);
  const [rotation, setRotation] = useState(0);

  const handleClick = () => {
    turns.current += 1;
    setRotation(turns.current * 180);
    onClick?.();
  };

  return (
    <Button
      type="button"
      variant="secondary"
      className={className}
      onClick={handleClick}
      aria-label={t("flipBoard.label")}
      title={t("flipBoard.label")}
    >
      <span
        className="flip-icon"
        style={{ transform: `rotate(${rotation}deg)` }}
        aria-hidden="true"
      >
        ⟳
      </span>
    </Button>
  );
}
