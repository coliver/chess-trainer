# backend/app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.app.modules.email.sender import supported_languages
from backend.app.modules.shared.db import get_db
from backend.app.modules.users.models import User
from backend.app.routers.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

THEMES = {"light", "dark", "system"}
BOARD_THEMES = {
    "default",
    "default-contrast",
    "green",
    "blue",
    "chess-club",
    "chessboard-js",
    "black-and-white",
}
PIECE_SETS = {"standard", "staunty"}
BOARD_ORIENTATION_MODES = {"auto", "white", "black"}


class PreferencesOut(BaseModel):
    language: str
    theme: str
    board_theme: str
    piece_set: str
    show_coordinates: bool
    board_animations: bool
    board_orientation_mode: str
    sound: bool


class PreferencesUpdate(BaseModel):
    language: str | None = None
    theme: str | None = None
    board_theme: str | None = None
    piece_set: str | None = None
    show_coordinates: bool | None = None
    board_animations: bool | None = None
    board_orientation_mode: str | None = None
    sound: bool | None = None


def _serialize(user: User) -> PreferencesOut:
    return PreferencesOut(
        language=user.language,
        theme=user.theme,
        board_theme=user.board_theme,
        piece_set=user.piece_set,
        show_coordinates=user.show_coordinates,
        board_animations=user.board_animations,
        board_orientation_mode=user.board_orientation_mode,
        sound=user.sound,
    )


@router.get("/me/preferences", response_model=PreferencesOut)
def get_preferences(current_user: User = Depends(get_current_user)):
    return _serialize(current_user)


@router.patch("/me/preferences", response_model=PreferencesOut)
def update_preferences(
    req: PreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    if req.language is not None and req.language not in supported_languages():
        raise HTTPException(status_code=422, detail="Unsupported language")
    if req.theme is not None and req.theme not in THEMES:
        raise HTTPException(status_code=422, detail="Invalid theme")
    if req.board_theme is not None and req.board_theme not in BOARD_THEMES:
        raise HTTPException(status_code=422, detail="Invalid board_theme")
    if req.piece_set is not None and req.piece_set not in PIECE_SETS:
        raise HTTPException(status_code=422, detail="Invalid piece_set")
    if (
        req.board_orientation_mode is not None
        and req.board_orientation_mode not in BOARD_ORIENTATION_MODES
    ):
        raise HTTPException(status_code=422, detail="Invalid board_orientation_mode")

    for field in PreferencesUpdate.model_fields:
        value = getattr(req, field)
        if value is not None:
            setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return _serialize(current_user)
