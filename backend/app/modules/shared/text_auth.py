LOGIN_INSTRUCTIONS = """Not authenticated.

Log in first:
  curl -X POST https://knightschool.click/api/auth/login \\
    -H "Content-Type: application/json" \\
    -d '{"username":"<you>","password":"<yours>"}'

Then reuse the access_token as a Bearer header on any .text route, e.g.:
  curl -H "Authorization: Bearer <token>" https://knightschool.click/api/dashboard.text
"""
