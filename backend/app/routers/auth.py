# backend/app/routers/auth.py
import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone  # Update your imports
from typing import Any

import jwt
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr, constr

from backend.app.modules.email.sender import send_verification_email, supported_languages
from backend.app.modules.shared.db import get_db
from backend.app.modules.users.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    username: constr(min_length=1, strip_whitespace=True)
    password: constr(min_length=1)
    language: str | None = None


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
    return base64.b64encode(salt + dk).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    raw = base64.b64decode(password_hash.encode("ascii"))
    salt, dk_stored = raw[:16], raw[16:]
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
    return hmac.compare_digest(dk, dk_stored)


def _email_verification_required() -> bool:
    return os.getenv("EMAIL_VERIFICATION_REQUIRED", "false").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


@router.post("/register")
def register(req: RegisterRequest, background_tasks: BackgroundTasks, db=Depends(get_db)):
    existing = (
        db.query(User).filter((User.email == req.email) | (User.username == req.username)).first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Email or username already exists")

    verification_required = _email_verification_required()
    language = req.language if req.language in supported_languages() else "en-US"
    user = User(
        email=req.email,
        username=req.username,
        password_hash=hash_password(req.password),
        is_active=True,
        email_verified=not verification_required,
        email_verified_at=None if verification_required else datetime.now(timezone.utc),
        email_verify_token_version=0,
        language=language,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    if verification_required:
        background_tasks.add_task(
            send_verification_email,
            user.email,
            create_email_verification_token(user.id, user.email_verify_token_version),
            user.language,
        )
    return {"id": user.id, "email": user.email, "username": user.username}


class LoginRequest(BaseModel):
    email: EmailStr | None = None
    username: constr(min_length=1, strip_whitespace=True) | None = None
    password: constr(min_length=1)


@router.post("/login")
def login(req: LoginRequest, db=Depends(get_db)):
    if not req.email and not req.username:
        raise HTTPException(status_code=400, detail="Provide email or username")

    q = db.query(User)
    user = None
    if req.email:
        user = q.filter(User.email == req.email).first()
    else:
        user = q.filter(User.username == req.username).first()

    if user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if _email_verification_required() and not user.email_verified:
        raise HTTPException(status_code=403, detail="Email not verified")

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "access_token": access_token,
        "refresh_token": refresh_token,  # Return both
        "token_type": "Bearer",
    }


def _jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="JWT_SECRET not configured")
    return secret


def _jwt_algorithm() -> str:
    return os.getenv("JWT_ALGORITHM", "HS256")


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    exp_min = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))
    exp = now + timedelta(minutes=exp_min)

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "type": "access",  # Add type to distinguish from refresh token
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=_jwt_algorithm())


def create_refresh_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    # Refresh tokens usually last much longer (e.g., 7 days)
    exp_days = int(os.getenv("JWT_REFRESH_EXPIRES_DAYS", "7"))
    exp = now + timedelta(days=exp_days)

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "type": "refresh",  # Mark as refresh token
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=_jwt_algorithm())


def create_email_verification_token(user_id: int, version: int) -> str:
    now = datetime.now(timezone.utc)
    exp_hours = int(os.getenv("EMAIL_VERIFY_EXPIRES_HOURS", "24"))
    exp = now + timedelta(hours=exp_hours)

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "type": "email_verify",
        "ver": version,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=_jwt_algorithm())


def get_current_user(
    authorization: str | None = Header(default=None),
    db=Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")

    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(
            token,
            _jwt_secret(),
            algorithms=[_jwt_algorithm()],
        )
        # SECURITY: Ensure the token is an access token, not a refresh token
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token")

        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_id = int(sub)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid token")

    return user


def get_current_user_or_none(
    authorization: str | None = Header(default=None),
    db=Depends(get_db),
) -> User | None:
    """Same checks as get_current_user, but returns None instead of raising.

    For .text routes, which report unauthenticated access as a plain-text
    message rather than the JSON error body get_current_user's exceptions
    produce.
    """
    try:
        return get_current_user(authorization=authorization, db=db)
    except HTTPException:
        return None


# New /refresh endpoint
class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh")
def refresh(req: RefreshRequest, db=Depends(get_db)):
    try:
        payload = jwt.decode(
            req.refresh_token,
            _jwt_secret(),
            algorithms=[_jwt_algorithm()],
        )
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token")

        user_id = int(payload.get("sub"))
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User inactive or not found")

        return {
            "access_token": create_access_token(user.id),
            "token_type": "Bearer",
        }
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username}


@router.get("/verify-email")
def verify_email(token: str, db=Depends(get_db)):
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[_jwt_algorithm()])
        if payload.get("type") != "email_verify":
            raise HTTPException(status_code=400, detail="Invalid or expired token")
        user_id = int(payload.get("sub"))
        token_version = payload.get("ver")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    if token_version is None or int(token_version) != user.email_verify_token_version:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    if not user.email_verified:
        user.email_verified = True
        user.email_verified_at = datetime.now(timezone.utc)
        db.commit()

    return {"email": user.email, "verified": True}


class ResendVerificationRequest(BaseModel):
    email: EmailStr | None = None
    username: constr(min_length=1, strip_whitespace=True) | None = None


@router.post("/resend-verification")
def resend_verification(
    req: ResendVerificationRequest, background_tasks: BackgroundTasks, db=Depends(get_db)
):
    if not req.email and not req.username:
        raise HTTPException(status_code=400, detail="Provide email or username")

    user = None
    if req.email:
        user = db.query(User).filter(User.email == req.email).first()
    else:
        user = db.query(User).filter(User.username == req.username).first()

    if user and not user.email_verified:
        user.email_verify_token_version += 1
        db.commit()
        background_tasks.add_task(
            send_verification_email,
            user.email,
            create_email_verification_token(user.id, user.email_verify_token_version),
            user.language,
        )

    return {
        "message": "If that account exists and is unverified, a verification email has been sent."
    }
