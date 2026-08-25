# tests/test_puzzles_text_routes.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

from backend.app.app import app
from backend.app.modules.puzzles.models import Puzzle
from backend.app.routers.auth import get_current_user_or_none


@pytest.fixture(autouse=True)
def _empty_puzzles_table(db):
    # See test_puzzles_service.py: the dev DB carries seeded puzzles outside
    # this test's rolled-back transaction, so clear it for deterministic
    # "next puzzle" selection.
    db.execute(delete(Puzzle))
    db.commit()


def make_puzzle(db, id="p1", rating=1200, popularity=90, moves="e2e4 e7e5", themes="opening"):
    puzzle = Puzzle(
        id=id,
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        moves=moves,
        rating=rating,
        popularity=popularity,
        nb_plays=100,
        themes=themes,
    )
    db.add(puzzle)
    db.commit()
    return puzzle


def make_2_solver_move_puzzle(db, id="p1"):
    return make_puzzle(db, id=id, moves="e2e4 e7e5 g1f3 b8c6", themes="mateIn2")


def test_puzzles_themes_text_requires_auth():
    with TestClient(app) as client:
        r = client.get("/puzzles/themes.text")
        assert r.status_code == 401
        assert "Not authenticated" in r.text


def test_puzzles_themes_text_lists_themes_and_counts(db, test_user):
    make_puzzle(db, id="p1", themes="mate fork")
    make_puzzle(db, id="p2", themes="mate")

    app.dependency_overrides[get_current_user_or_none] = lambda: test_user
    try:
        with TestClient(app) as client:
            r = client.get("/puzzles/themes.text")
            assert r.status_code == 200
            assert r.headers["content-type"].startswith("text/plain")
            assert "Puzzle themes" in r.text
            assert "mate" in r.text
            assert "fork" in r.text
            assert "next.text?theme=" in r.text
    finally:
        app.dependency_overrides.pop(get_current_user_or_none, None)


def test_puzzles_next_text_requires_auth():
    with TestClient(app) as client:
        r = client.get("/puzzles/next.text")
        assert r.status_code == 401
        assert "Not authenticated" in r.text


def test_puzzles_next_text_renders_board_and_prompt(db, test_user):
    make_puzzle(db)

    app.dependency_overrides[get_current_user_or_none] = lambda: test_user
    try:
        with TestClient(app) as client:
            r = client.get("/puzzles/next.text")
            assert r.status_code == 200
            assert r.headers["content-type"].startswith("text/plain")
            assert "Puzzle p1" in r.text
            assert "Move 1 of 1" in r.text
            assert "attempts.text?moveUci=" in r.text
    finally:
        app.dependency_overrides.pop(get_current_user_or_none, None)


def test_puzzles_attempt_text_requires_auth(db):
    make_puzzle(db)
    with TestClient(app) as client:
        r = client.post("/puzzles/p1/attempts.text?moveUci=e7e5&moveIndex=0")
        assert r.status_code == 401
        assert "Not authenticated" in r.text


def test_puzzles_attempt_text_correct_single_move(db, test_user):
    make_puzzle(db)

    app.dependency_overrides[get_current_user_or_none] = lambda: test_user
    try:
        with TestClient(app) as client:
            r = client.post("/puzzles/p1/attempts.text?moveUci=e7e5&moveIndex=0")
            assert r.status_code == 200
            assert r.headers["content-type"].startswith("text/plain")
            assert "Correct!" in r.text
            assert "Puzzle complete." in r.text
    finally:
        app.dependency_overrides.pop(get_current_user_or_none, None)


def test_puzzles_attempt_text_incorrect_move(db, test_user):
    make_puzzle(db)

    app.dependency_overrides[get_current_user_or_none] = lambda: test_user
    try:
        with TestClient(app) as client:
            r = client.post("/puzzles/p1/attempts.text?moveUci=e7e6&moveIndex=0")
            assert r.status_code == 200
            assert "Incorrect." in r.text
    finally:
        app.dependency_overrides.pop(get_current_user_or_none, None)


def test_puzzles_attempt_text_multi_move_sequence(db, test_user):
    make_2_solver_move_puzzle(db)

    app.dependency_overrides[get_current_user_or_none] = lambda: test_user
    try:
        with TestClient(app) as client:
            r1 = client.post("/puzzles/p1/attempts.text?moveUci=e7e5&moveIndex=0")
            assert r1.status_code == 200
            assert "Correct!" in r1.text
            assert "Puzzle complete." not in r1.text
            assert "Keep going" in r1.text

            r2 = client.post("/puzzles/p1/attempts.text?moveUci=b8c6&moveIndex=1")
            assert r2.status_code == 200
            assert "Correct!" in r2.text
            assert "Puzzle complete." in r2.text
    finally:
        app.dependency_overrides.pop(get_current_user_or_none, None)


def test_puzzles_attempt_text_unknown_puzzle_404(db, test_user):
    app.dependency_overrides[get_current_user_or_none] = lambda: test_user
    try:
        with TestClient(app) as client:
            r = client.post("/puzzles/does-not-exist/attempts.text?moveUci=e7e5&moveIndex=0")
            assert r.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user_or_none, None)
