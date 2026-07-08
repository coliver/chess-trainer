# ./tests/test_auth_register.py
import re
import uuid
import pytest
from sqlalchemy import text
from fastapi.testclient import TestClient
from backend.app.app import app

from backend.app.routers.auth import verify_password, hash_password

API_BASE = ""

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def _uniq_email(base: str) -> str:
    name, domain = base.split("@", 1)
    return f"{name}+{uuid.uuid4().hex[:8]}@{domain}"

def _uniq_username(base: str) -> str:
    return f"{base}+{uuid.uuid4().hex[:8]}"

@pytest.mark.parametrize("payload, status_code", [
    ({"email": "a@example.com", "username": "alice", "password": "test12345"}, 200),
    ({"email": "bad-email", "username": "alice", "password": "test12345"}, 422),
    ({"email": "a@example.com", "username": "", "password": "test12345"}, 422),
    ({"email": "a@example.com", "username": "alice", "password": ""}, 422),
])
def test_register_validation(client, payload, status_code):
    payload = dict(payload)

    if status_code == 200:
        payload["email"] = _uniq_email(payload["email"])
        payload["username"] = _uniq_username(payload["username"])
    else:
        # Avoid uniqueness conflicts so validation errors are what we assert.
        if payload.get("username", None) == "":
            payload["email"] = _uniq_email(payload["email"])
        if payload.get("password", None) == "":
            payload["email"] = _uniq_email(payload["email"])
            payload["username"] = _uniq_username(payload["username"])

    r = client.post(f"{API_BASE}/auth/register", json=payload)
    assert r.status_code == status_code

def test_register_conflict_email(client):
    suffix = uuid.uuid4().hex[:8]
    payload = {
        "email": f"c+{suffix}@example.com",
        "username": f"carol+{suffix}",
        "password": "test12345",
    }

    r1 = client.post(f"{API_BASE}/auth/register", json=payload)
    assert r1.status_code in (200, 201)

    r2 = client.post(f"{API_BASE}/auth/register", json=payload)
    assert r2.status_code == 409
    assert r2.json()["detail"] == "Email or username already exists"

def test_register_conflict_username(client):
    suffix = uuid.uuid4().hex[:8]
    payload1 = {
        "email": f"u1+{suffix}@example.com",
        "username": f"dave+{suffix}",
        "password": "test12345",
    }
    payload2 = {
        "email": f"u2+{suffix}@example.com",
        "username": f"dave+{suffix}",
        "password": "test12345",
    }

    r1 = client.post(f"{API_BASE}/auth/register", json=payload1)
    assert r1.status_code in (200, 201)

    r2 = client.post(f"{API_BASE}/auth/register", json=payload2)
    assert r2.status_code == 409
    assert r2.json()["detail"] == "Email or username already exists"

def test_register_password_hash_and_timestamps(client, db):
    suffix = uuid.uuid4().hex[:8]
    payload = {
        "email": f"ph+{suffix}@example.com",
        "username": f"erin+{suffix}",
        "password": "test12345",
    }

    r = client.post(f"{API_BASE}/auth/register", json=payload)
    assert r.status_code in (200, 201)

    user = db.execute(
        text("SELECT id, password_hash, created_at, updated_at FROM users WHERE email = :e"),
        {"e": payload["email"]},
    ).one()._mapping

    assert user["password_hash"] != payload["password"]
    assert re.match(r"^[A-Za-z0-9+/]+=*$", user["password_hash"]) is not None
    assert user["created_at"] is not None
    assert user["updated_at"] is not None

def test_register_password_hash_uses_salt(client, db):
    suffix = uuid.uuid4().hex[:8]
    p1 = {"email": f"salt1+{suffix}@example.com", "username": f"fiona1+{suffix}", "password": "same-password"}
    p2 = {"email": f"salt2+{suffix}@example.com", "username": f"fiona2+{suffix}", "password": "same-password"}

    r1 = client.post(f"{API_BASE}/auth/register", json=p1)
    r2 = client.post(f"{API_BASE}/auth/register", json=p2)
    assert r1.status_code in (200, 201)
    assert r2.status_code in (200, 201)

    h1 = db.execute(
        text("SELECT password_hash FROM users WHERE email = :e"),
        {"e": p1["email"]},
    ).one()._mapping["password_hash"]

    h2 = db.execute(
        text("SELECT password_hash FROM users WHERE email = :e"),
        {"e": p2["email"]},
    ).one()._mapping["password_hash"]

    assert h1 != h2

def test_verify_password_success_roundtrip():
    password = "test12345"
    password_hash = hash_password(password)
    assert verify_password(password, password_hash) is True

def test_verify_password_fails_wrong_password():
    password_hash = hash_password("correct-password")
    assert verify_password("wrong-password", password_hash) is False

def test_verify_password_fails_for_empty_password():
    password_hash = hash_password("nonempty")
    assert verify_password("", password_hash) is False
