import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.modules.progress.models import PositionProgress
from backend.app.modules.progress.srs import SrsState, next_state, quality_from_correctness


def record_attempt(
    db: Session,
    user_id: int,
    fen: str,
    correct_move_uci: str,
    is_correct: bool,
    opening_eco: str | None = None,
    opening_name: str | None = None,
) -> PositionProgress:
    """Upsert the per-user/per-position progress row and advance its SM-2 schedule."""
    row = db.execute(
        select(PositionProgress).where(
            PositionProgress.user_id == user_id,
            PositionProgress.fen == fen,
            PositionProgress.correct_move_uci == correct_move_uci,
        )
    ).scalar_one_or_none()

    now = datetime.datetime.now(datetime.timezone.utc)

    if row is None:
        row = PositionProgress(
            user_id=user_id,
            fen=fen,
            correct_move_uci=correct_move_uci,
            opening_eco=opening_eco,
            opening_name=opening_name,
            attempts=0,
            correct_count=0,
            incorrect_count=0,
            ease_factor=2.5,
            interval_days=0,
            repetitions=0,
        )
        db.add(row)

    row.attempts += 1
    if is_correct:
        row.correct_count += 1
    else:
        row.incorrect_count += 1

    if opening_eco is not None:
        row.opening_eco = opening_eco
    if opening_name is not None:
        row.opening_name = opening_name

    quality = quality_from_correctness(is_correct)
    result = next_state(
        quality,
        SrsState(
            ease_factor=row.ease_factor,
            interval_days=row.interval_days,
            repetitions=row.repetitions,
        ),
        now=now,
    )
    row.ease_factor = result.ease_factor
    row.interval_days = result.interval_days
    row.repetitions = result.repetitions
    row.due_at = result.due_at
    row.last_seen_at = now

    db.flush()
    return row


def get_summary(db: Session, user_id: int) -> dict:
    rows = list(
        db.scalars(select(PositionProgress).where(PositionProgress.user_id == user_id)).all()
    )

    positions_seen = len(rows)
    total_attempts = sum(r.attempts for r in rows)
    total_correct = sum(r.correct_count for r in rows)
    overall_accuracy = (total_correct / total_attempts) if total_attempts else 0.0
    mastered = sum(1 for r in rows if r.repetitions >= 2)

    by_opening: dict[str, dict] = {}
    for r in rows:
        key = r.opening_name or "Unknown"
        bucket = by_opening.setdefault(key, {"opening_name": key, "attempts": 0, "correct": 0})
        bucket["attempts"] += r.attempts
        bucket["correct"] += r.correct_count

    opening_breakdown = [
        {
            "opening_name": b["opening_name"],
            "attempts": b["attempts"],
            "accuracy": (b["correct"] / b["attempts"]) if b["attempts"] else 0.0,
        }
        for b in by_opening.values()
    ]

    return {
        "positions_seen": positions_seen,
        "overall_accuracy": overall_accuracy,
        "mastered": mastered,
        "opening_breakdown": opening_breakdown,
    }


def get_due(
    db: Session, user_id: int, now: datetime.datetime | None = None
) -> list[PositionProgress]:
    now = now or datetime.datetime.now(datetime.timezone.utc)
    return list(
        db.scalars(
            select(PositionProgress)
            .where(PositionProgress.user_id == user_id, PositionProgress.due_at <= now)
            .order_by(PositionProgress.due_at.asc())
        ).all()
    )


def get_weak_spots(db: Session, user_id: int, limit: int = 20) -> list[PositionProgress]:
    rows = list(
        db.scalars(
            select(PositionProgress).where(
                PositionProgress.user_id == user_id, PositionProgress.attempts > 0
            )
        ).all()
    )
    rows.sort(key=lambda r: ((r.correct_count / r.attempts), -r.attempts))
    return rows[:limit]
