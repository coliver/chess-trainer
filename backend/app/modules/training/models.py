from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.modules.shared.db import Base


class TrainingSession(Base):
    __tablename__ = "training_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="active")
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    opening_eco: Mapped[str | None] = mapped_column(String, nullable=True)
    opening_name: Mapped[str | None] = mapped_column(String, nullable=True)
    player_color: Mapped[str] = mapped_column(String(1), nullable=False, default="w")

    items = relationship("TrainingItem", back_populates="session", cascade="all, delete-orphan")

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    user = relationship("User", back_populates="training_sessions")


class TrainingItem(Base):
    __tablename__ = "training_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("training_sessions.id", ondelete="CASCADE"), index=True
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    fen: Mapped[str] = mapped_column(String, nullable=False)
    correct_move_uci: Mapped[str] = mapped_column(String, nullable=False)

    # Set only for items whose session spans multiple openings (review
    # sessions from due positions); a single-opening session's items rely on
    # TrainingSession.opening_eco/opening_name instead. See
    # create_session_from_due and submit_training_response.
    opening_eco: Mapped[str | None] = mapped_column(String, nullable=True)
    opening_name: Mapped[str | None] = mapped_column(String, nullable=True)

    session = relationship("TrainingSession", back_populates="items")
    responses = relationship(
        "TrainingResponse", back_populates="item", cascade="all, delete-orphan"
    )


class TrainingResponse(Base):
    __tablename__ = "training_responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(
        ForeignKey("training_items.id", ondelete="CASCADE"), unique=True, index=True
    )

    submitted_move_uci: Mapped[str] = mapped_column(String, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    reason: Mapped[str] = mapped_column(String, nullable=False)
    fen_after: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    item = relationship("TrainingItem", back_populates="responses")
