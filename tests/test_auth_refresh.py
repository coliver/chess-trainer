import pytest
from fastapi.testclient import TestClient
from backend.app.app import app
from backend.app.routers.auth import create_access_token, create_refresh_token, hash_password
from backend.app.modules.users.models import User

client = TestClient(app)


def test_login_returns_both_tokens(db):
    # 1. Setup: Create the user in the test database
    test_username = "testuser"
    test_password = "password123"

    user = User(
        username=test_username,
        email="test@example.com",
        password_hash=hash_password(test_password),  # Must be hashed!
        is_active=True,
    )
    db.add(user)
    db.commit()

    response = client.post(
        "/auth/login", json={"username": test_username, "password": test_password}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_refresh_token_cannot_access_protected_route(db):
    # 1. Create a refresh token manually
    user = db.query(User).first()
    refresh_token = create_refresh_token(user.id)

    # 2. Try to use it as a Bearer token for the protected POST endpoint
    response = client.post(
        "/training-sessions",  # Use the actual route
        headers={"Authorization": f"Bearer {refresh_token}"},
    )

    # Should be 401 because 'type' is 'refresh', not 'access'
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token"


def test_refresh_endpoint_success(db):
    user = db.query(User).first()
    refresh_token = create_refresh_token(user.id)

    response = client.post("/auth/refresh", json={"refresh_token": refresh_token})

    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "refresh_token" not in response.json()  # Refresh endpoint should only give access tokens


def test_refresh_endpoint_invalid_token():
    response = client.post("/auth/refresh", json={"refresh_token": "not-a-real-token"})
    assert response.status_code == 401
