from fastapi.testclient import TestClient

from backend.app.app import app
from backend.app.modules.users.models import AuthEvent
from backend.app.routers.auth import create_access_token, create_refresh_token

client = TestClient(app)


def _events(db):
    return db.query(AuthEvent).order_by(AuthEvent.id).all()


def test_login_success_records_login_event(db, test_user):
    client.post("/auth/login", json={"username": test_user.username, "password": "password123"})

    events = _events(db)
    assert [(e.event_type, e.user_id) for e in events] == [("login", test_user.id)]
    assert events[0].ip is not None


def test_login_bad_password_records_failed_event_with_user(db, test_user):
    client.post("/auth/login", json={"username": test_user.username, "password": "wrong"})

    assert [(e.event_type, e.user_id) for e in _events(db)] == [("login_failed", test_user.id)]


def test_login_unknown_user_records_failed_event_without_user(db):
    client.post("/auth/login", json={"username": "nobody", "password": "x"})

    assert [(e.event_type, e.user_id) for e in _events(db)] == [("login_failed", None)]


def test_login_blocked_unverified_records_failed_event(db, unverified_user, monkeypatch):
    monkeypatch.setenv("EMAIL_VERIFICATION_REQUIRED", "true")
    client.post(
        "/auth/login", json={"username": unverified_user.username, "password": "password123"}
    )

    assert [(e.event_type, e.user_id) for e in _events(db)] == [
        ("login_failed", unverified_user.id)
    ]


def test_register_records_register_event(db):
    response = client.post(
        "/auth/register",
        json={"email": "new@example.com", "username": "newbie", "password": "pw123456"},
    )

    assert response.status_code == 200
    assert [(e.event_type, e.user_id) for e in _events(db)] == [("register", response.json()["id"])]


def test_logout_with_valid_token_records_logout_event(db, test_user):
    token = create_access_token(test_user.id)
    response = client.post("/auth/logout", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 204
    assert [(e.event_type, e.user_id) for e in _events(db)] == [("logout", test_user.id)]


def test_logout_without_token_is_204_and_records_nothing(db):
    response = client.post("/auth/logout")

    assert response.status_code == 204
    assert _events(db) == []


def test_logout_rejects_refresh_token_as_credential(db, test_user):
    token = create_refresh_token(test_user.id)
    response = client.post("/auth/logout", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 204
    assert _events(db) == []


def test_login_still_succeeds_if_event_write_fails(db, test_user, monkeypatch):
    def boom(**kwargs):
        raise RuntimeError("db down")

    monkeypatch.setattr("backend.app.routers.auth.AuthEvent", boom)
    # The test session wraps an outer transaction; a real rollback would also
    # discard the fixture's user, so neutralize it for this test only.
    monkeypatch.setattr(db, "rollback", lambda: None)

    response = client.post(
        "/auth/login", json={"username": test_user.username, "password": "password123"}
    )

    assert response.status_code == 200
    assert "access_token" in response.json()
