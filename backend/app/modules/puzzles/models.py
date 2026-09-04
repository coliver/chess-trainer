import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.modules.shared.db import Base


class Puzzle(Base):
    """A single Lichess puzzle-DB entry (CC0 dataset, curated subset)."""

    __tablename__ = "puzzles"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # Lichess PuzzleId

    fen: Mapped[str] = mapped_column(String, nullable=False)
    # Full UCI move sequence as shipped by Lichess: moves[0] is the opponent's
    # setup move (auto-played to reach the puzzle position), moves[1] is the
    # first move the solver must find.
    moves: Mapped[str] = mapped_column(String, nullable=False)

    rating: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    popularity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    nb_plays: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    themes: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class PuzzleProgress(Base):
    """Per-user/per-puzzle attempt history + SM-2 review schedule."""

    __tablename__ = "puzzle_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "puzzle_id", name="uq_puzzle_progress_user_puzzle"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    puzzle_id: Mapped[str] = mapped_column(ForeignKey("puzzles.id", ondelete="CASCADE"), index=True)

    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    correct_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    incorrect_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    hint_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    ease_factor: Mapped[float] = mapped_column(Float, nullable=False, default=2.5)
    interval_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    repetitions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    due_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user = relationship("User", back_populates="puzzle_progress")
    puzzle = relationship("Puzzle")
