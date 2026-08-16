from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app.app import app
from backend.app.routers.auth import create_email_verification_token

client = TestClient(app)

GENERIC_MESSAGE = "If that account exists and is unverified, a verification email has been sent."


def test_resend_verification_sends_for_unverified_user(unverified_user):
    with patch("backend.app.routers.auth.send_verification_email") as mock_send:
        response = client.post("/auth/resend-verification", json={"email": unverified_user.email})

    assert response.status_code == 200
    assert response.json()["message"] == GENERIC_MESSAGE
    mock_send.assert_called_once()
    assert mock_send.call_args[0][0] == unverified_user.email


def test_resend_verification_by_username(unverified_user):
    with patch("backend.app.routers.auth.send_verification_email") as mock_send:
        response = client.post(
            "/auth/resend-verification", json={"username": unverified_user.username}
        )

    assert response.status_code == 200
    mock_send.assert_called_once()


def test_resend_verification_no_send_for_already_verified_user(test_user):
    with patch("backend.app.routers.auth.send_verification_email") as mock_send:
        response = client.post("/auth/resend-verification", json={"email": test_user.email})

    assert response.status_code == 200
    assert response.json()["message"] == GENERIC_MESSAGE
    mock_send.assert_not_called()


def test_resend_verification_unknown_email_no_error():
    with patch("backend.app.routers.auth.send_verification_email") as mock_send:
        response = client.post("/auth/resend-verification", json={"email": "nobody@example.com"})

    assert response.status_code == 200
    assert response.json()["message"] == GENERIC_MESSAGE
    mock_send.assert_not_called()


def test_resend_verification_requires_identifier():
    response = client.post("/auth/resend-verification", json={})

    assert response.status_code == 400
    assert response.json()["detail"] == "Provide email or username"


def test_resend_verification_bumps_token_version_and_invalidates_prior_token(unverified_user):
    stale_token = create_email_verification_token(
        unverified_user.id, unverified_user.email_verify_token_version
    )
    original_version = unverified_user.email_verify_token_version

    with patch("backend.app.routers.auth.send_verification_email") as mock_send:
        response = client.post("/auth/resend-verification", json={"email": unverified_user.email})

    assert response.status_code == 200
    assert unverified_user.email_verify_token_version == original_version + 1

    stale_check = client.get("/auth/verify-email", params={"token": stale_token})
    assert stale_check.status_code == 400
    assert unverified_user.email_verified is False

    new_token = mock_send.call_args[0][1]
    fresh_check = client.get("/auth/verify-email", params={"token": new_token})
    assert fresh_check.status_code == 200
    assert unverified_user.email_verified is True
