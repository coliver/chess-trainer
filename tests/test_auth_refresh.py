from fastapi.testclient import TestClient
from backend.app.app import app
from backend.app.routers.auth import create_refresh_token
from backend.app.modules.users.models import User

client = TestClient(app)


def test_login_returns_both_tokens(db, test_user):
    # 1. Setup: Use the data from the fixture instead of creating a new User object
    test_username = test_user.username
    test_password = "password123"  # This must match the password in your fixture

    # 2. Execution: Attempt to login
    response = client.post(
        "/auth/login", json={"username": test_username, "password": test_password}
    )

    # 3. Verification
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
