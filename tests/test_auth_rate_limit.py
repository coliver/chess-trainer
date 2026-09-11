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


def test_register_and_login_have_independent_rate_limits(test_user):
    for _ in range(5):
        response = client.post(
            "/auth/register",
            json={"email": "x@example.com", "username": "x", "password": "whatever"},
        )
        assert response.status_code in (200, 409)

    response = client.post(
        "/auth/register",
        json={"email": "y@example.com", "username": "y", "password": "whatever"},
    )
    assert response.status_code == 429

    # /login must still have its own, unexhausted budget
    response = client.post(
        "/auth/login",
        json={"username": test_user.username, "password": "wrong"},
    )
    assert response.status_code == 401
