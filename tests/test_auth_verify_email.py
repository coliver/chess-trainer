from fastapi.testclient import TestClient

from backend.app.app import app
from backend.app.routers.auth import create_access_token, create_email_verification_token

client = TestClient(app)


def test_verify_email_success(unverified_user):
    token = create_email_verification_token(
        unverified_user.id, unverified_user.email_verify_token_version
    )

    response = client.get("/auth/verify-email", params={"token": token})

    assert response.status_code == 200
    assert response.json() == {"email": unverified_user.email, "verified": True}
    assert unverified_user.email_verified is True
    assert unverified_user.email_verified_at is not None


def test_verify_email_is_idempotent(unverified_user):
    token = create_email_verification_token(
        unverified_user.id, unverified_user.email_verify_token_version
    )

    first = client.get("/auth/verify-email", params={"token": token})
    verified_at_after_first = unverified_user.email_verified_at
    second = client.get("/auth/verify-email", params={"token": token})

    assert first.status_code == 200
    assert second.status_code == 200
    assert unverified_user.email_verified is True
    assert unverified_user.email_verified_at == verified_at_after_first


def test_verify_email_invalid_token():
    response = client.get("/auth/verify-email", params={"token": "not-a-real-token"})

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or expired token"


def test_verify_email_rejects_wrong_token_type(unverified_user):
    access_token = create_access_token(unverified_user.id)

    response = client.get("/auth/verify-email", params={"token": access_token})

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or expired token"
    assert unverified_user.email_verified is False


def test_verify_email_expired_token(monkeypatch, unverified_user):
    monkeypatch.setenv("EMAIL_VERIFY_EXPIRES_HOURS", "-1")
    token = create_email_verification_token(
        unverified_user.id, unverified_user.email_verify_token_version
    )

    response = client.get("/auth/verify-email", params={"token": token})

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or expired token"


def test_verify_email_unknown_user():
    token = create_email_verification_token(999_999_999, 0)

    response = client.get("/auth/verify-email", params={"token": token})

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or expired token"


def test_verify_email_stale_token_rejected_after_new_token_issued(unverified_user):
    stale_token = create_email_verification_token(
        unverified_user.id, unverified_user.email_verify_token_version
    )

    # Simulate a resend: a new token is issued at a bumped version.
    unverified_user.email_verify_token_version += 1
    fresh_token = create_email_verification_token(
        unverified_user.id, unverified_user.email_verify_token_version
    )

    stale_response = client.get("/auth/verify-email", params={"token": stale_token})
    assert stale_response.status_code == 400
    assert stale_response.json()["detail"] == "Invalid or expired token"
    assert unverified_user.email_verified is False

    fresh_response = client.get("/auth/verify-email", params={"token": fresh_token})
    assert fresh_response.status_code == 200
    assert unverified_user.email_verified is True
