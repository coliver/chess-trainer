import pytest
from fastapi.testclient import TestClient

from backend.app.app import app

client = TestClient(app)


def test_home_returns_html():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/html")
    assert "Chess Trainer API" in resp.text
    assert "GET /ping" in resp.text


def test_ping_returns_ok():
    resp = client.get("/ping")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("application/json")
    assert resp.json() == {"message": "ok"}


def test_ping_schema_is_message_string():
    resp = client.get("/ping")
    data = resp.json()
    assert isinstance(data["message"], str)
