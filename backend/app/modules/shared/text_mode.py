# Knight/horse ASCII art credit: Andreas Freise (asciiart.eu)
KNIGHT_SCHOOL_BANNER = r"""                                         |
                                         |
                                         + \
    __ __ _   ______________  ________   \.G_.*=.       _____ ________  ______  ____  __
   / //_// | / /  _/ ____/ / / /_  __/    `(#'/.\|     / ___// ____/ / / / __ \/ __ \/ /
  / ,<  /  |/ // // / __/ /_/ / / /        .>' (_--.   \__ \/ /   / /_/ / / / / / / / /
 / /| |/ /|  // // /_/ / __  / / /      _=/d   ,^\    ___/ / /___/ __  / /_/ / /_/ / /___
/_/ |_/_/ |_/___/\____/_/ /_/ /_/      ~~ \)-'   '   /____/\____/_/ /_/\____/\____/_____/
                                          / |   a:f
                                         '  '"""

LOGIN_INSTRUCTIONS = """Not authenticated.

Log in first:
  curl -X POST https://knightschool.click/api/auth/login \\
    -H "Content-Type: application/json" \\
    -d '{"username":"<you>","password":"<yours>"}'

Then reuse the access_token as a Bearer header on any .text route, e.g.:
  curl -H "Authorization: Bearer <token>" https://knightschool.click/api/dashboard.text
"""
