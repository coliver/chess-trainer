from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app.app import app
from backend.app.routers import auth as auth_module

client = TestClient(app)


def test_login_blocked_when_email_not_verified(unverified_user):
    response = client.post(
        "/auth/login",
        json={"username": unverified_user.username, "password": "password123"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Email not verified"


def test_login_succeeds_when_email_verified(test_user):
    response = client.post(
        "/auth/login",
        json={"username": test_user.username, "password": "password123"},
    )

    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_with_nonexistent_user_still_verifies_password():
    with patch(
        "backend.app.routers.auth.verify_password",
        wraps=auth_module.verify_password,
    ) as spy:
        response = client.post(
            "/auth/login",
            json={"username": "no-such-user", "password": "whatever"},
        )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"
    spy.assert_called_once()
