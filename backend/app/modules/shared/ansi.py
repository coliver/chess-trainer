# ANSI SGR helpers for the .text BBS-style routes. Colors are applied by
# default and stripped by each router when the caller passes ?ansi=0.
RESET = "\x1b[0m"
BOLD = "\x1b[1m"
DIM = "\x1b[2m"

FG_GOLD = "\x1b[38;5;220m"
FG_PLUM = "\x1b[38;5;132m"
FG_ROSE = "\x1b[38;5;168m"
FG_GREEN = "\x1b[38;5;108m"
FG_RED = "\x1b[38;5;167m"
FG_CYAN = "\x1b[38;5;73m"
FG_WHITE = "\x1b[38;5;253m"
FG_GREY = "\x1b[38;5;244m"

BG_LIGHT_SQUARE = "\x1b[48;5;180m"
BG_DARK_SQUARE = "\x1b[48;5;95m"
FG_WHITE_PIECE = "\x1b[38;5;255m"
FG_BLACK_PIECE = "\x1b[38;5;16m"

_ANSI_RE_SOURCE = r"\x1b\[[0-9;]*m"


def sgr(text: str, *codes: str) -> str:
    """Wrap text in the given SGR codes, resetting afterward."""
    return f"{''.join(codes)}{text}{RESET}"


def strip_ansi(text: str) -> str:
    """Remove SGR escape codes, for callers that opt out via ?ansi=0."""
    import re

    return re.sub(_ANSI_RE_SOURCE, "", text)
