KNIGHT_SCHOOL_BANNER = r"""    __ __ _   ______________  ________   _____ ________  ______  ____  __
   / //_// | / /  _/ ____/ / / /_  __/  / ___// ____/ / / / __ \/ __ \/ /
  / ,<  /  |/ // // / __/ /_/ / / /     \__ \/ /   / /_/ / / / / / / / /
 / /| |/ /|  // // /_/ / __  / / /     ___/ / /___/ __  / /_/ / /_/ / /___
/_/ |_/_/ |_/___/\____/_/ /_/ /_/     /____/\____/_/ /_/\____/\____/_____/"""

LOGIN_INSTRUCTIONS = """Not authenticated.

Log in first:
  curl -X POST https://knightschool.click/api/auth/login \\
    -H "Content-Type: application/json" \\
    -d '{"username":"<you>","password":"<yours>"}'

Then reuse the access_token as a Bearer header on any .text route, e.g.:
  curl -H "Authorization: Bearer <token>" https://knightschool.click/api/dashboard.text
"""
