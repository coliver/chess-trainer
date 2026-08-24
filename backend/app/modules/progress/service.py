import dataclasses
import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.modules.progress.models import PositionProgress, UserStreak
from backend.app.modules.progress.srs import SrsState, next_state, quality_from_correctness
from backend.app.modules.progress.streak import next_streak
from backend.app.modules.training.models import TrainingItem, TrainingResponse, TrainingSession


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

    record_streak(db, user_id=user_id, today=now.date())

    return row


def record_streak(db: Session, user_id: int, today: datetime.date) -> UserStreak:
    """Upsert the user's daily streak counter."""
    row = db.execute(select(UserStreak).where(UserStreak.user_id == user_id)).scalar_one_or_none()

    if row is None:
        row = UserStreak(user_id=user_id, current_streak=0, longest_streak=0, last_active_date=None)
        db.add(row)

    result = next_streak(
        today=today,
        prev_last_active=row.last_active_date,
        prev_current=row.current_streak,
        prev_longest=row.longest_streak,
    )
    row.current_streak = result.current_streak
    row.longest_streak = result.longest_streak
    row.last_active_date = result.last_active_date

    db.flush()
    return row


def get_streak(db: Session, user_id: int) -> UserStreak | None:
    return db.execute(select(UserStreak).where(UserStreak.user_id == user_id)).scalar_one_or_none()


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

    streak = get_streak(db, user_id)

    return {
        "positions_seen": positions_seen,
        "overall_accuracy": overall_accuracy,
        "mastered": mastered,
        "opening_breakdown": opening_breakdown,
        "current_streak": streak.current_streak if streak else 0,
        "longest_streak": streak.longest_streak if streak else 0,
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


@dataclasses.dataclass
class WeakSpot:
    fen: str | None
    correct_move_uci: str | None
    opening_eco: str | None
    opening_name: str | None
    attempts: int
    correct_count: int
    incorrect_count: int


def get_weak_spots(db: Session, user_id: int, limit: int = 20) -> list[WeakSpot]:
    """Aggregate per-position attempts by opening, so a weak opening with several
    difficult positions surfaces as one entry instead of one per position."""
    rows = list(
        db.scalars(
            select(PositionProgress).where(
                PositionProgress.user_id == user_id, PositionProgress.attempts > 0
            )
        ).all()
    )

    groups: dict[str, WeakSpot] = {}
    order: list[str] = []
    for r in rows:
        key = r.opening_name if r.opening_name else f"__position_{r.id}"
        if key not in groups:
            groups[key] = WeakSpot(
                fen=r.fen if not r.opening_name else None,
                correct_move_uci=r.correct_move_uci if not r.opening_name else None,
                opening_eco=r.opening_eco,
                opening_name=r.opening_name,
                attempts=0,
                correct_count=0,
                incorrect_count=0,
            )
            order.append(key)
        group = groups[key]
        group.attempts += r.attempts
        group.correct_count += r.correct_count
        group.incorrect_count += r.incorrect_count

    spots = [groups[key] for key in order]
    spots = [s for s in spots if s.correct_count < s.attempts]
    spots.sort(key=lambda s: ((s.correct_count / s.attempts), -s.attempts))
    return spots[:limit]


@dataclasses.dataclass
class WrongMoveCount:
    move_uci: str
    count: int


@dataclasses.dataclass
class StepAccuracy:
    opening_eco: str | None
    opening_name: str | None
    order_index: int
    correct_move_uci: str
    attempts: int
    correct_count: int
    incorrect_count: int
    accuracy: float
    common_wrong_moves: list[WrongMoveCount]


def _step_accuracy_query(db: Session, user_id: int | None):
    """Row source for step accuracy: every scored response joined back to the
    opening step (order_index) it belongs to, falling back to the parent
    session's opening/eco when the item itself doesn't carry one (see
    TrainingItem.opening_eco/opening_name docstring) and to the session's
    player_color-implied opening for plain (non-review) sessions.

    Also returns enough to identify trainee-authored plies vs. the opponent's
    auto-played replies (see _is_trainee_ply) — a session alternates trainee
    and opponent moves, and the frontend silently submits the opponent's
    (always book-correct) reply as a real TrainingResponse too, so those must
    be excluded or every "opponent" order_index would show ~100% accuracy."""
    query = (
        select(
            func.coalesce(TrainingItem.opening_eco, TrainingSession.opening_eco).label("eco"),
            func.coalesce(TrainingItem.opening_name, TrainingSession.opening_name).label("name"),
            TrainingItem.order_index,
            TrainingItem.correct_move_uci,
            TrainingResponse.submitted_move_uci,
            TrainingResponse.is_correct,
            TrainingItem.opening_eco.is_not(None).label("is_review_item"),
            TrainingSession.player_color,
        )
        .select_from(TrainingResponse)
        .join(TrainingItem, TrainingResponse.item_id == TrainingItem.id)
        .join(TrainingSession, TrainingItem.session_id == TrainingSession.id)
    )
    if user_id is not None:
        query = query.where(TrainingSession.user_id == user_id)
    return query


def _is_trainee_ply(order_index: int, is_review_item: bool, player_color: str) -> bool:
    """True if this order_index within its session is a move the trainee had
    to choose, not the opponent's auto-played reply. Review items are always
    trainee-only (each is seeded as one due position - see
    create_session_from_due); a normal session alternates white/black moves
    starting with White at order_index 0."""
    if is_review_item:
        return True
    trainee_is_white = player_color == "w"
    ply_is_white = order_index % 2 == 0
    return ply_is_white == trainee_is_white


def _aggregate_step_accuracy(rows, limit: int, worst_first: bool) -> list[StepAccuracy]:
    groups: dict[tuple, dict] = {}
    order: list[tuple] = []
    for (
        eco,
        name,
        order_index,
        correct_move_uci,
        submitted_move_uci,
        is_correct,
        is_review_item,
        player_color,
    ) in rows:
        if not _is_trainee_ply(order_index, is_review_item, player_color):
            continue
        key = (eco, name, order_index)
        if key not in groups:
            groups[key] = {
                "correct_move_uci": correct_move_uci,
                "attempts": 0,
                "correct_count": 0,
                "wrong_moves": {},
            }
            order.append(key)
        bucket = groups[key]
        bucket["attempts"] += 1
        if is_correct:
            bucket["correct_count"] += 1
        else:
            bucket["wrong_moves"][submitted_move_uci] = (
                bucket["wrong_moves"].get(submitted_move_uci, 0) + 1
            )

    results = []
    for eco, name, order_index in order:
        b = groups[(eco, name, order_index)]
        incorrect_count = b["attempts"] - b["correct_count"]
        common_wrong = sorted(
            (WrongMoveCount(move_uci=m, count=c) for m, c in b["wrong_moves"].items()),
            key=lambda w: -w.count,
        )[:5]
        results.append(
            StepAccuracy(
                opening_eco=eco,
                opening_name=name,
                order_index=order_index,
                correct_move_uci=b["correct_move_uci"],
                attempts=b["attempts"],
                correct_count=b["correct_count"],
                incorrect_count=incorrect_count,
                accuracy=(b["correct_count"] / b["attempts"]) if b["attempts"] else 0.0,
                common_wrong_moves=common_wrong,
            )
        )

    results.sort(key=lambda s: (s.accuracy, -s.attempts) if worst_first else (-s.attempts,))
    return results[:limit]


def get_step_accuracy(db: Session, user_id: int, limit: int = 50) -> list[StepAccuracy]:
    """Per-user step accuracy: which ply (order_index) within each opening this
    user fails most often, and what they tend to play instead."""
    rows = db.execute(_step_accuracy_query(db, user_id)).all()
    return _aggregate_step_accuracy(rows, limit=limit, worst_first=True)


def get_global_step_accuracy(db: Session, limit: int = 50) -> list[StepAccuracy]:
    """Cross-user step accuracy: which ply within each opening trips up
    trainees generally, aggregated over every user's attempts."""
    rows = db.execute(_step_accuracy_query(db, user_id=None)).all()
    return _aggregate_step_accuracy(rows, limit=limit, worst_first=True)
