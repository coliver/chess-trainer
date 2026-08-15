from fastapi.testclient import TestClient

from backend.app.app import app

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
