from fastapi.testclient import TestClient

from backend.app.app import app

client = TestClient(app)


def test_login_rate_limited_after_too_many_attempts(test_user):
    for _ in range(5):
        response = client.post(
            "/auth/login",
            json={"username": test_user.username, "password": "wrong"},
        )
        assert response.status_code == 401

    response = client.post(
        "/auth/login",
        json={"username": test_user.username, "password": "wrong"},
    )
    assert response.status_code == 429
