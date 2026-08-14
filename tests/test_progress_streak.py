import datetime

from backend.app.modules.progress.streak import next_streak


def test_first_activity_starts_streak_at_one():
    today = datetime.date(2026, 1, 1)
    result = next_streak(today, prev_last_active=None, prev_current=0, prev_longest=0)
    assert result.current_streak == 1
    assert result.longest_streak == 1
    assert result.last_active_date == today


def test_same_day_activity_does_not_double_count():
    today = datetime.date(2026, 1, 1)
    result = next_streak(today, prev_last_active=today, prev_current=3, prev_longest=3)
    assert result.current_streak == 3
    assert result.longest_streak == 3


def test_consecutive_day_increments_streak():
    yesterday = datetime.date(2026, 1, 1)
    today = datetime.date(2026, 1, 2)
    result = next_streak(today, prev_last_active=yesterday, prev_current=3, prev_longest=3)
    assert result.current_streak == 4
    assert result.longest_streak == 4


def test_gap_resets_streak_but_keeps_longest():
    old = datetime.date(2026, 1, 1)
    today = datetime.date(2026, 1, 5)
    result = next_streak(today, prev_last_active=old, prev_current=5, prev_longest=5)
    assert result.current_streak == 1
    assert result.longest_streak == 5
