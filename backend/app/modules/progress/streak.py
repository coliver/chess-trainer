"""Pure streak-counting logic (no DB access — unit-testable in isolation)."""

import datetime
from dataclasses import dataclass


@dataclass
class StreakResult:
    current_streak: int
    longest_streak: int
    last_active_date: datetime.date


def next_streak(
    today: datetime.date,
    prev_last_active: datetime.date | None,
    prev_current: int,
    prev_longest: int,
) -> StreakResult:
    """Advance a daily streak given today's activity date and prior state."""
    if prev_last_active == today:
        current = prev_current
    elif prev_last_active == today - datetime.timedelta(days=1):
        current = prev_current + 1
    else:
        current = 1

    longest = max(prev_longest, current)
    return StreakResult(current_streak=current, longest_streak=longest, last_active_date=today)
