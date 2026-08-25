# backend/app/app.py
from fastapi import Depends, FastAPI
from fastapi.responses import HTMLResponse, PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.modules.progress.service import get_summary
from backend.app.modules.puzzles.service import get_puzzle_summary
from backend.app.modules.shared.db import get_db
from backend.app.modules.shared.text_mode import KNIGHT_SCHOOL_BANNER, LOGIN_INSTRUCTIONS
from backend.app.routers.auth import get_current_user_or_none
from backend.app.routers.auth import router as auth_router
from backend.app.routers.openings import router as openings_router
from backend.app.routers.progress import render_progress_summary
from backend.app.routers.progress import router as progress_router
from backend.app.routers.puzzles import render_puzzle_summary
from backend.app.routers.puzzles import router as puzzles_router
from backend.app.routers.training import router as training_router
from backend.app.routers.users import router as users_router

app = FastAPI(title="Knight School")

app.include_router(training_router, prefix="")
app.include_router(auth_router, prefix="")
app.include_router(openings_router, prefix="")
app.include_router(progress_router, prefix="")
app.include_router(puzzles_router, prefix="")
app.include_router(users_router, prefix="")


class PingResponse(BaseModel):
    message: str


@app.get("/", response_class=HTMLResponse)
def home():
    return """
    <html>
      <body style="font-family: sans-serif; margin: 40px;">
        <h1>Knight School API</h1>
        <p>Try <code>GET /ping</code>.</p>
      </body>
    </html>
    """


@app.get("/ping", response_model=PingResponse)
def ping():
    return {"message": "ok"}


@app.get("/dashboard.text", response_class=PlainTextResponse)
def dashboard_text(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_or_none),
):
    if current_user is None:
        body = KNIGHT_SCHOOL_BANNER + "\n\n" + LOGIN_INSTRUCTIONS
        return PlainTextResponse(body, status_code=401)
    progress = get_summary(db, current_user.id)
    puzzles = get_puzzle_summary(db, current_user.id)
    body = "\n\n".join(
        [
            KNIGHT_SCHOOL_BANNER,
            f"logged in as {current_user.email}",
            render_progress_summary(progress),
            render_puzzle_summary(puzzles),
        ]
    )
    return body
