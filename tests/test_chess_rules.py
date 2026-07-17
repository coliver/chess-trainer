from backend.app.modules.training.chess_rules import validate_and_apply


def test_invalid_uci_returns_400():
    res = validate_and_apply(
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        move_uci="not_a_uci",
        expected_correct_uci="e2e4",
    )
    assert res.http_status == 400


def test_illegal_move_returns_correct_false_illegal():
    res = validate_and_apply(
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        move_uci="e2e5",  # illegal from start
        expected_correct_uci="e2e4",
    )
    assert res.correct is False
    assert res.reason == "illegal move"
    assert res.fen_after is None


def test_wrong_legal_move_returns_wrong_move_and_fen_after():
    res = validate_and_apply(
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        move_uci="g1f3",  # legal but not expected
        expected_correct_uci="e2e4",
    )
    assert res.correct is False
    assert res.reason == "wrong move"
    assert res.fen_after is not None


def test_correct_move_returns_correct_and_fen_after():
    res = validate_and_apply(
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        move_uci="e2e4",
        expected_correct_uci="e2e4",
    )
    assert res.correct is True
    assert res.reason == "correct move"
    assert res.fen_after is not None
