# backend/app/routers/auth.py
import base64
import hashlib
import os
import hmac

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, constr


from backend.app.modules.shared.db import get_db
from backend.app.modules.users.models import User

router = APIRouter(prefix="/auth", tags=["auth"])



class RegisterRequest(BaseModel):
    email: EmailStr
    username: constr(min_length=1, strip_whitespace=True)
    password: constr(min_length=1)



def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
    return base64.b64encode(salt + dk).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    raw = base64.b64decode(password_hash.encode("ascii"))
    salt, dk_stored = raw[:16], raw[16:]
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
    return hmac.compare_digest(dk, dk_stored)


@router.post("/register")
def register(req: RegisterRequest, db=Depends(get_db)):
    existing = (
        db.query(User)
        .filter((User.email == req.email) | (User.username == req.username))
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Email or username already exists")

    user = User(
        email=req.email,
        username=req.username,
        password_hash=hash_password(req.password),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "username": user.username}
