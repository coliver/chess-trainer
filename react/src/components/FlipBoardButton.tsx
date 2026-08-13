import { Button } from "./Button";
type FlipBoardProps = {
    onClick?: () => void;
};

export function FlipBoardButton({ onClick }: FlipBoardProps) {
    return (
        <Button type="button" onClick={onClick} >
            Flip Board
        </Button>
    )
}