import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.modules.shared.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)

    # store a hash, not the raw password
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    email_verified_at: Mapped["datetime.datetime | None"] = mapped_column(
        DateTime, nullable=True, default=None
    )
    email_verify_token_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    language: Mapped[str] = mapped_column(String(20), nullable=False, default="en")

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    training_sessions = relationship(
        "TrainingSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    position_progress = relationship(
        "PositionProgress",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    streak = relationship(
        "UserStreak",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    puzzle_progress = relationship(
        "PuzzleProgress",
        back_populates="user",
        cascade="all, delete-orphan",
    )
