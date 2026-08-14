import datetime

from backend.app.modules.progress.srs import SrsState, next_state, quality_from_correctness


def test_quality_from_correctness():
    assert quality_from_correctness(True) == 5
    assert quality_from_correctness(False) == 2


def test_first_correct_answer_sets_interval_to_one_day():
    prev = SrsState(ease_factor=2.5, interval_days=0, repetitions=0)
    now = datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc)

    result = next_state(quality=5, prev=prev, now=now)

    assert result.repetitions == 1
    assert result.interval_days == 1
    assert result.due_at == now + datetime.timedelta(days=1)


def test_interval_grows_with_repeated_correct_answers():
    now = datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc)
    state = SrsState(ease_factor=2.5, interval_days=0, repetitions=0)

    r1 = next_state(5, state, now=now)
    state = SrsState(r1.ease_factor, r1.interval_days, r1.repetitions)
    r2 = next_state(5, state, now=now)
    state = SrsState(r2.ease_factor, r2.interval_days, r2.repetitions)
    r3 = next_state(5, state, now=now)

    assert r1.interval_days == 1
    assert r2.interval_days == 6
    assert r3.interval_days > r2.interval_days


def test_wrong_answer_resets_repetitions_and_interval():
    now = datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc)
    prev = SrsState(ease_factor=2.5, interval_days=6, repetitions=2)

    result = next_state(quality=2, prev=prev, now=now)

    assert result.repetitions == 0
    assert result.interval_days == 1
    assert result.due_at == now + datetime.timedelta(days=1)


def test_ease_factor_has_a_floor_of_1_3():
    now = datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc)
    state = SrsState(ease_factor=1.3, interval_days=1, repetitions=1)

    result = next_state(quality=0, prev=state, now=now)

    assert result.ease_factor >= 1.3
