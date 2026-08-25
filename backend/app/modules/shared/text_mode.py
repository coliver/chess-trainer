from fastapi.responses import PlainTextResponse

from backend.app.modules.shared.ansi import FG_GOLD, FG_GREY, FG_ROSE, sgr, strip_ansi

# Knight/horse ASCII art credit: Andreas Freise (asciiart.eu)
KNIGHT_SCHOOL_BANNER_PLAIN = r"""                                         |
                                         |
                                         + \
    __ __ _   ______________  ________   \.G_.*=.       _____ ________  ______  ____  __
   / //_// | / /  _/ ____/ / / /_  __/    `(#'/.\|     / ___// ____/ / / / __ \/ __ \/ /
  / ,<  /  |/ // // / __/ /_/ / / /        .>' (_--.   \__ \/ /   / /_/ / / / / / / / /
 / /| |/ /|  // // /_/ / __  / / /      _=/d   ,^\    ___/ / /___/ __  / /_/ / /_/ / /___
/_/ |_/_/ |_/___/\____/_/ /_/ /_/      ~~ \)-'   '   /____/\____/_/ /_/\____/\____/_____/
                                          / |   a:f
                                         '  '"""


# Per-line [start, end) column range of the knight/horse art, hand-measured
# against KNIGHT_SCHOOL_BANNER_PLAIN so it can be colored separately from the
# gold wordmark glyphs on either side.
_KNIGHT_ART_COLUMNS = [
    (41, 42),
    (41, 42),
    (41, 44),
    (39, 51),
    (39, 52),
    (40, 52),
    (37, 50),
    (37, 53),
    (42, 51),
    (41, 45),
]


def _colorize_line(line: str, columns: tuple[int, int]) -> str:
    start, end = columns
    left = sgr(line[:start], FG_GOLD) if line[:start].strip() else line[:start]
    mid = line[start:end]
    mid = sgr(mid, FG_GREY) if mid.strip() else mid
    right = sgr(line[end:], FG_GOLD) if line[end:].strip() else line[end:]
    return left + mid + right


KNIGHT_SCHOOL_BANNER = "\n".join(
    _colorize_line(line, columns)
    for line, columns in zip(KNIGHT_SCHOOL_BANNER_PLAIN.split("\n"), _KNIGHT_ART_COLUMNS)
)

LOGIN_INSTRUCTIONS = f"""{sgr("Not authenticated.", FG_ROSE)}

{sgr("Log in first:", FG_GOLD)}
  curl -X POST https://knightschool.click/api/auth/login \\
    -H "Content-Type: application/json" \\
    -d '{{"username":"<you>","password":"<yours>"}}'

Then reuse the access_token as a Bearer header on any .text route, e.g.:
  curl -H "Authorization: Bearer <token>" https://knightschool.click/api/dashboard.text
"""

TEXT_MODE_OPTIONS = f"""{sgr("What next?", FG_GOLD)}
  GET /api/puzzles/next.text          serve a puzzle to solve
  GET /api/puzzles/summary.text       your puzzle stats
  GET /api/puzzles/themes.text        browse puzzle themes
  GET /api/progress/summary.text      your opening progress
  GET /api/dashboard.text             back to this dashboard

Add the Bearer token to each request, e.g.:
  curl -H "Authorization: Bearer <token>" https://knightschool.click/api/puzzles/next.text"""


def text_response(body: str, ansi: bool = True, status_code: int = 200) -> PlainTextResponse:
    """Every .text route's single return point: strips ANSI color codes
    when the caller passes ?ansi=0, for scripts/pipes that don't want them."""
    return PlainTextResponse(body if ansi else strip_ansi(body), status_code=status_code)
