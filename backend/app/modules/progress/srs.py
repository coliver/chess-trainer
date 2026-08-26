"""Pure SM-2 spaced-repetition scheduling logic.

No DB access here — keeps this trivially unit-testable.
"""

import datetime
from dataclasses import dataclass

MAX_INTERVAL_DAYS = 365


@dataclass
class SrsState:
    ease_factor: float
    interval_days: int
    repetitions: int


@dataclass
class SrsResult:
    ease_factor: float
    interval_days: int
    repetitions: int
    due_at: datetime.datetime


def quality_from_correctness(is_correct: bool) -> int:
    """Map a boolean training result onto the SM-2 0-5 quality scale."""
    return 5 if is_correct else 2


def next_state(
    quality: int,
    prev: SrsState,
    now: datetime.datetime | None = None,
) -> SrsResult:
    """Compute the next SM-2 state given a quality score (0-5) and prior state."""
    now = now or datetime.datetime.now(datetime.timezone.utc)

    ease_factor = prev.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    ease_factor = max(1.3, ease_factor)

    if quality < 3:
        repetitions = 0
        interval_days = 1
    else:
        repetitions = prev.repetitions + 1
        if repetitions == 1:
            interval_days = 1
        elif repetitions == 2:
            interval_days = 6
        else:
            interval_days = round(prev.interval_days * ease_factor)
        interval_days = min(interval_days, MAX_INTERVAL_DAYS)

    due_at = now + datetime.timedelta(days=interval_days)

    return SrsResult(
        ease_factor=ease_factor,
        interval_days=interval_days,
        repetitions=repetitions,
        due_at=due_at,
    )
